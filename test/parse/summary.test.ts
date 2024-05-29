import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from '../helpers/TestTools'
import Summary from '../../src/parse/Summary'

let testTools: TestTools

describe('summary', () => {
  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    testTools.cleanup()
  })
  it('should work', async () => {
    const summary = new Summary({
      bookPath: testTools.cwd,
      bookName: "Test Book",
      bookDesc: "This is a test book",
      uuidMap: new Map([
        ['001', {
          toc: {
            title: 'Title1',
            type: 'TITLE',
            uuid: '001',
            parent_uuid: '000',
            child_uuid: ''
          }
        } as any],
        ['002', {
          path: '002/doc.md',
          toc: {
            title: 'DOC1',
            type: 'DOC',
            uuid: '002',
            parent_uuid: '001',
            child_uuid: ''
          }
        } as any],
        ['003', {
          toc: {
            title: 'Title2',
            type: 'TITLE',
            uuid: '003',
            parent_uuid: '000',
            child_uuid: ''
          }
        } as any],
        ['004', {
          path: '004/doc.md',
          toc: {
            title: 'DOC2',
            type: 'DOC',
            uuid: '004',
            parent_uuid: '003',
            child_uuid: ''
          }
        } as any],
        ['006', {
          path: '006/doc.md',
          toc: {
            title: 'DOC3',
            type: 'DOC',
            uuid: '006',
            parent_uuid: '005',
            child_uuid: ''
          }
        } as any],
        ['005', {
          toc: {
            title: 'Title2-1',
            type: 'TITLE',
            uuid: '005',
            parent_uuid: '003',
            child_uuid: ''
          }
        } as any],
      ])
    })
    await summary.genFile()
    const data = readFileSync(path.join(testTools.cwd, 'SUMMARY.md'))
    expect(data.toString()).toMatchSnapshot()
  })

  // 标题也是文档
  it('the title is also a doc', async () => {
    const summary = new Summary({
      bookPath: testTools.cwd,
      bookName: "Test Book",
      bookDesc: "This is a test book",
      uuidMap: new Map([
        ['001', {
          path: '001/doc.md',
          toc: {
            title: 'Title1',
            type: 'DOC',
            uuid: '001',
            parent_uuid: '000',
            child_uuid: '002'
          }
        } as any],
        ['002', {
          path: '002/doc.md',
          toc: {
            title: 'DOC1',
            type: 'DOC',
            uuid: '002',
            parent_uuid: '001',
            child_uuid: ''
          }
        } as any],
      ])
    })
    await summary.genFile()
    const data = readFileSync(path.join(testTools.cwd, 'SUMMARY.md'))
    expect(data.toString()).toMatchSnapshot()
  })
})