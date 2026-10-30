import { describe, expect, it } from "vitest"
import { getCategory, scalePosition } from "./aqi"

describe("getCategory", () => {
  it("puts a band's upper edge in that band", () => {
    expect(getCategory(50).key).toBe("good")
    expect(getCategory(51).key).toBe("moderate")
  })

  it("treats readings above 500 as hazardous", () => {
    expect(getCategory(650).key).toBe("hazardous")
  })
})

describe("scalePosition", () => {
  it("runs from 0 to 100 percent", () => {
    expect(scalePosition(0)).toBe(0)
    expect(scalePosition(500)).toBeCloseTo(100)
  })
})
