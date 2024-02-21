import pako from 'pako'

interface SheetItemData {
  [key: string]: {
    [key: string]: {
      v: string
    }
  }
}

interface SheetItem {
  name: string,
  rowCount: number,
  selections: {
    row: number,
    col: number,
    rowCount: number,
    colCount: number,
    activeCol: number,
    activeRow: number
  },
  rows: any,
  columns: any,
  filter: any,
  index: 0,
  colCount: 26,
  mergeCells: any,
  id: string,
  data: SheetItemData,
  vStore: any
}

// 表格类型解析
export const parseSheet = (sheetStr: string) => {
  if (!sheetStr) return ''
  const sheetList: SheetItem[] = JSON.parse(pako.inflate(sheetStr, {
    to: "string"
  }))
  let mdData = ''
  sheetList.forEach((item) => {
    const sheetTitle = `## ${item.name}\n`
    const table = genMdTable(item.data)
    mdData = `${mdData}\n${sheetTitle}\n${table}`
  })
  return mdData
}

function genMdTable(data: SheetItemData) {
  let rowList: string[] = Object.keys(data)
  // 过滤掉空白行
  rowList = rowList.filter(rowKey => {
    const colList = Object.keys(data[rowKey])
    return colList.some(col => data?.[rowKey]?.[col]?.v)
  })
  let colList: string[] = []
  rowList.forEach(rowKey => {
    const cols = data[rowKey]
    if (cols) colList = colList.concat(Object.keys(cols))
  })

  const rowMax = Math.max(...rowList.map(row => Number(row)))
  const colMax = Math.max(...colList.map(col => Number(col)))
  if (rowMax < 0 || colMax < 0) return ''
  let tableMd = ''
  const TITLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let rowTitle = Array(colMax + 1).fill(' ').map((v, i) => {
    const index = i % (TITLE.length)
    return TITLE[index]
  }).join(' | ')
  rowTitle = `| |${rowTitle}|`
  let rowTitleLine = Array(colMax + 2).fill('---').join(' |' )
  rowTitleLine = `|${rowTitleLine}|`
  tableMd = `${rowTitle}\n${rowTitleLine}\n`

  for (let row = 0; row < rowMax + 1; row++) {
    const colData = []
    for (let col = 0; col < colMax + 1; col++) {
      const v: any = data?.[row]?.[col]?.v || null
      if (v && typeof v === 'string') {
        colData.push(v)
      } else if (v && typeof v === 'object') {
        // 单元格内含图片
        if (v?.class === 'image' && v?.src) {
          colData.push(`![${v?.name}'](${v?.src})`)
        } else if(v?.class === 'checkbox') {
          colData.push(v?.value ? '[x] ': '[ ] ')
        } else if(v?.class === 'link') {
          colData.push(`[${v?.text}](${v?.url})`)
        } else if(v?.class === 'select') {
          colData.push(v?.value?.join(','))
        }
      } else {
        colData.push(null)
      }
    }
    const rowMd = `| ${row + 1} | ${colData.join(' | ')}|`
    tableMd = `${tableMd}${rowMd}\n`
  }
  return tableMd
}