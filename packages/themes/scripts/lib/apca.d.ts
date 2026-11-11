export interface ApcaConstants {
  mainTRC: number
  sRco: number
  sGco: number
  sBco: number
  normBG: number
  normTXT: number
  revTXT: number
  revBG: number
  blkThrs: number
  blkClmp: number
  scaleBoW: number
  scaleWoB: number
  loBoWoffset: number
  loWoBoffset: number
  deltaYmin: number
  loClip: number
}

export const APCA_SA98G: ApcaConstants

export function srgbToY(color: string, constants?: ApcaConstants): number

export function apcaContrast(
  textHex: string,
  backgroundHex: string,
  constants?: ApcaConstants,
): number
