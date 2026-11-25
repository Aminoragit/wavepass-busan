export interface Spot {
  id: string;
  name: string;
  district: string;
  category: "beach" | "culture" | "market" | "nature" | "landmark";
  lat: number;
  lng: number;
  description: string;
  /** Stamps needed milestone this spot belongs to (display only) */
  zone: string;
}

export const SPOTS: Spot[] = [
  {
    id: "haeundae",
    name: "해운대해수욕장",
    district: "해운대구",
    category: "beach",
    lat: 35.1587,
    lng: 129.1604,
    description: "부산의 대표 해변. 달맞이길과 동백섬 산책의 출발점.",
    zone: "동부산",
  },
  {
    id: "gwangalli",
    name: "광안리해수욕장",
    district: "수영구",
    category: "beach",
    lat: 35.1532,
    lng: 129.1186,
    description: "광안대교 야경으로 유명한 도심 해변.",
    zone: "동부산",
  },
  {
    id: "gamcheon",
    name: "감천문화마을",
    district: "사하구",
    category: "culture",
    lat: 35.0974,
    lng: 129.0106,
    description: "계단식 색채 마을, '한국의 마추픽추'로 불리는 골목 관광지.",
    zone: "서부산",
  },
  {
    id: "jagalchi",
    name: "자갈치시장",
    district: "중구",
    category: "market",
    lat: 35.0968,
    lng: 129.0309,
    description: "한국 최대 수산시장. 남포동 먹거리 골목과 연결된다.",
    zone: "원도심",
  },
  {
    id: "taejongdae",
    name: "태종대",
    district: "영도구",
    category: "nature",
    lat: 35.0525,
    lng: 129.0877,
    description: "영도 남단 해안 절벽과 등대, 다누비 열차.",
    zone: "원도심",
  },
  {
    id: "songdo",
    name: "송도해수욕장",
    district: "서구",
    category: "beach",
    lat: 35.0758,
    lng: 129.0169,
    description: "1913년 개장한 한국 최초의 공설 해수욕장, 해상 케이블카.",
    zone: "서부산",
  },
  {
    id: "yonggungsa",
    name: "해동용궁사",
    district: "기장군",
    category: "landmark",
    lat: 35.1883,
    lng: 129.2231,
    description: "바닷가 절벽 위에 선 사찰, 일출 명소.",
    zone: "동부산",
  },
  {
    id: "yongdusan",
    name: "용두산공원 · 부산타워",
    district: "중구",
    category: "landmark",
    lat: 35.1006,
    lng: 129.0326,
    description: "원도심 전경을 한눈에 볼 수 있는 부산의 상징 타워.",
    zone: "원도심",
  },
];

/** Stamps required to unlock a coupon reward. */
export const COUPON_THRESHOLD = 4;
