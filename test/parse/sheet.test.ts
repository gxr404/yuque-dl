import { describe, expect, it } from 'vitest'
import { parseSheet, genMarkdownTable } from '../../src/parse/sheet'

const sheetData = 'x\x9CÕ\x97]oâ8\x14@ÿ\x8B\x9F¡øÚÎ\x17o£®´O+u\x06i´«j\x1EÒà¶¨!aBh»ªøïë\x04(9i;ê<.\x0F\x88kû:Ç×É\t¾~QU¾öj®\x16÷Þ·¢&ª©\x9F.ë]Õª¹Ñz¢¶¾ôE»ª«­\x9A¿t\x9Dj\x1EOTQ\x97jî\x86\x83¥o<\x07yHzô\x97Çq\x87è[\x9F½ïÓºéö}În]\x1D\x83ÛUÙúæð{U-ý³\x9Aëá´&\\yí\x9B;\x7FéËò\x98³Z\x06ø¿¿\x7Fý# /ó6ï(õë×cè\x14µ\x0Fã¤\ví©íÏÅbñåêêËUß×7ËëxÓ7:$\x88±\x87iL×\x12\x9F\x9A\x8Du\x87æ~`zj¶ÆõãCÏã¢­\x1Bß±î\',¶A±%qï\x16[ô±Úæ\x93Õ6¨¶èß*7æ5É\x07åþ+ß\x94\x01~ÓÔmÀ]\f ¯\x7F|´\v[\x15²Ía\x92SU_TQæÛ\x90¦\x8A{_<ÜÔÏaÖÇ¼Ü\x85\x1AµÍÎ¿n\x03Æ\x1E\x8At\x1Ey\x1D¶.\\¶Þ\x9C\x18^N=ÝÖOÎ\x91A\x14ö\'d­we»RóÛ¼Üú~íus\x8Cöoî\x9A3B¹ª\x1E\x02@ë\x9FC\x99ÔM¾ZîB¸kBùÕ}Ûn¶óÙìééé¢ï¹(êµúôRl\x88\x8CXóñ\x9A,\x17Õ\x8F\x1D¶Èpa]\x19ßY\x97Á\x1DßÝÄïíÊj\x9DßùÀ³m\x8AÁÂ\x8AeuQ\x95yóÐ-löïîçÎÏôÌhãf\x9BênfÂ\'³3Itjc\x9BÙ8ü\x98&7K\x1Fé<\x9AJ¶\x8C¦®pv\x9AÆ\x91\x9BÚ"Êo\x8C\x8FR/ñEÈ\x0E\x17;>"æyªµ¶É4,Ï¤ÖJ\x14õ\x03öo\x1FØÿ\x17þD%\x07\x1B\x9C\rÓ\x05Ñ0\x88\x87A2\fÒa\x90\r\x03Ñ\x88\x04\x91Ad\x11\x01CÀ!\x00\x11\x90\bP\x04,\x06,\x06,\x06,\x06,\x06,\x06,\x06,\x06,\x06,\x06,\x16,\x16,\x16,\x16,\x16,\x16,\x16,\x16,\x16,\x16,\x0E,\x0E,\x0E,\x0E,\x0E,\x0E,\x0E,\x0E,\x0E,\x0E,\x11X"°D`\x89À\x12ñ¶\x05K\x04\x96\b,\x11X"°Ä`\x89Á\x12\x83%\x06K\f\x96\x98Ï\x10Xb°Ä`\x89Á\x92\x80%\x01K\x02\x96\x04,\tX\x12°$| Á\x92\x80%\x01K\n\x96\x14,)XR°¤`IÁ\x92\x82%¥]À\x92\x82%\x03K\x06\x96\f,\x19X2°d`ÉÀ\x92\x81%£êF®£ì4m§©;Mßi\nOÓx\x9AÊÓt\x9E¦ô4©Æ\n&ÕHÂ#\v\x8F4<òðHÄ#\x13\x8FTL\x17\ve,fôf \x15},\x14²ÐÈB%\v\x9D,\x94²ÐÊB-\v½,vôÂ"\x15Õ,t³PÎB;\võ,ô³PÐBC\v\x15-t´PÒBK\v5-ô´PÔBS\vU-tµPÖB[K4z½\x93\x8AÂ\x16\x1A[¨l¡³\x85Ò\x16Z[¨m¡·\x85â\x96xô¯\x83Tt·PÞB{\võ-ô·Pà24øþWg5û©\x83±~{D\x1B\x9D`yTÓ8ªýÞIÍ|ê`\\­nÿ9\x1F\x8C¹Ä\x1Fÿ\x01?\x80sf'

describe('parseSheet', () => {
  it('should work', () => {
    const data = parseSheet(sheetData)
    expect(data).toMatchSnapshot()
  })
})

describe('genMarkdownTable', () => {
  it('should work', () => {
    const data = genMarkdownTable({
      0: { 0: {v: '单元格(0,0)'}},
      2: { 2: {v: '单元格(2,2)'}},
      4: { 4: {v: '单元格(4,4)'}}
    })
    expect(data).toMatchSnapshot()
  })
})
