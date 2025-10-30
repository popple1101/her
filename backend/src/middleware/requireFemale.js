// (라우터에서 직접 사용해도 되지만, 재사용용 헬퍼)
export function assertFemaleOrThrow(gender) {
  if (gender !== "female") {
    const e = new Error("female_only");
    e.status = 403;
    throw e;
  }
}
