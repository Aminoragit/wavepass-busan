"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState } from "../lib/server";

const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ label: string; explorer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    setState(json as AppState);
  }, []);

  useEffect(() => {
    load().catch(e => setError(String(e)));
  }, [load]);

  async function act(key: string, url: string, body?: unknown, label?: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.explorer) setLastTx({ label: label ?? "트랜잭션", explorer: json.explorer });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!state) {
    return (
      <div className="wrap">
        <p>불러오는 중… {error && <span style={{ color: "#c0392b" }}>{error}</span>}</p>
      </div>
    );
  }

  const pct = Math.round((state.stampCount / state.spots.length) * 100);
  const canClaim = state.stampCount >= state.threshold && state.coupon.balance === 0;

  return (
    <div className="wrap">
      <header className="hero">
        <span className="badge">Solana Devnet · 부산 블록체인 해커톤 2026</span>
        <h1>🌊 파도패스 WavePass Busan</h1>
        <p>
          부산 명소를 돌며 <strong>온체인 스탬프</strong>를 모으고, 스탬프 {state.threshold}개로{" "}
          <strong>지역 상점 쿠폰(토큰화 바우처)</strong>을 받는 관광 패스입니다.
          모든 체크인과 쿠폰 교환은 솔라나 블록체인에 기록되어 누구나 검증할 수 있습니다.
        </p>
      </header>

      {error && (
        <div className="panel" style={{ borderColor: "#e2703a" }}>
          <strong>오류:</strong> {error}
        </div>
      )}
      {lastTx && (
        <div className="tx">
          ✅ {lastTx.label} 완료 —{" "}
          <a href={lastTx.explorer} target="_blank" rel="noreferrer">
            Solana Explorer에서 트랜잭션 확인
          </a>
        </div>
      )}

      <section className="panel">
        <h2>내 파도패스 (데모 지갑)</h2>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="mono">
            지갑:{" "}
            <a href={explorerAddr(state.visitor)} target="_blank" rel="noreferrer">
              {state.visitor}
            </a>
          </span>
          <strong>
            스탬프 {state.stampCount} / {state.spots.length}
          </strong>
        </div>
        <div className="progress" style={{ margin: "10px 0" }}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="row">
          <span>
            쿠폰:{" "}
            {state.coupon.balance > 0 ? (
              <strong className="stamp-ok">🎟️ 쿠폰 1개 보유 중</strong>
            ) : (
              <span className="small">아직 없음 (스탬프 {state.threshold}개 필요)</span>
            )}
          </span>
          <button
            disabled={!canClaim || busy !== null}
            onClick={() => act("claim", "/api/coupon/claim", undefined, "쿠폰 발행")}
          >
            {busy === "claim" ? "발행 중…" : "쿠폰 받기"}
          </button>
          <button
            className="warn"
            disabled={state.coupon.balance === 0 || busy !== null}
            onClick={() => act("redeem", "/api/coupon/redeem", undefined, "쿠폰 사용(소각)")}
          >
            {busy === "redeem" ? "처리 중…" : "상점에서 쿠폰 사용하기"}
          </button>
        </div>
        <p className="small">
          쿠폰 사용 시 토큰은 소각(burn)되어 같은 쿠폰을 두 번 쓸 수 없습니다. 이것이 토큰화 바우처의 핵심입니다.
        </p>
      </section>

      <section>
        <h2 style={{ margin: "22px 0 10px" }}>부산 스탬프 명소</h2>
        <div className="grid">
          {state.spots.map(spot => (
            <article key={spot.id} className={`card${spot.held ? " held" : ""}`}>
              <h3>{spot.name}</h3>
              <div className="meta">
                {spot.district} · {spot.zone} · 누적 발행 {spot.totalIssued}개
              </div>
              <p>{spot.description}</p>
              {spot.held ? (
                <div className="stamp-ok">✔ 스탬프 획득 완료</div>
              ) : (
                <button
                  disabled={busy !== null}
                  onClick={() => act(spot.id, "/api/checkin", { spotId: spot.id }, `${spot.name} 체크인`)}
                >
                  {busy === spot.id ? "온체인 기록 중…" : "📍 여기서 체크인"}
                </button>
              )}
              {spot.mint && (
                <a className="small" href={explorerAddr(spot.mint)} target="_blank" rel="noreferrer">
                  스탬프 토큰(민트) 보기
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>🏙️ 도시 대시보드 — 투명한 관광 데이터</h2>
        <p className="small">
          지금까지 발행된 전체 스탬프: <strong>{state.totalStampsIssued}개</strong>. 아래 수치는 전부 온체인
          민트 공급량에서 직접 읽어 온 값으로, 부산시가 관광 분산·재방문 정책을 설계할 때 쓸 수 있는 공개
          데이터가 됩니다.
        </p>
        <table>
          <thead>
            <tr>
              <th>권역</th>
              <th>명소 수</th>
              <th>발행된 스탬프</th>
            </tr>
          </thead>
          <tbody>
            {[...new Set(state.spots.map(s => s.zone))].map(zone => {
              const inZone = state.spots.filter(s => s.zone === zone);
              return (
                <tr key={zone}>
                  <td>{zone}</td>
                  <td>{inZone.length}</td>
                  <td>{inZone.reduce((a, s) => a + s.totalIssued, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 10 }}>
          발행 기관(데모 운영자):{" "}
          <a className="mono" href={explorerAddr(state.operator)} target="_blank" rel="noreferrer">
            {state.operator}
          </a>{" "}
          · 네트워크: Solana Devnet
        </p>
      </section>
    </div>
  );
}
