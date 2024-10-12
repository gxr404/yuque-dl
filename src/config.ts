import {
  BoardExportType,
  DocExportType,
  IConfig,
  SheetExportType,
  TableExportType,
} from './types'

export const globalConfig: IConfig = {
  boardExportType: BoardExportType.lakeboard,
  distDir: 'docs',
  docExportType: DocExportType.md,
  ignoreImg: false,
  key: '',
  sheetExportType: SheetExportType.lakesheet,
  tableExportType: TableExportType.laketable,
  toc: true,
  token: '',
  url: '',
  host: '',
  secondDomain: '',
}

export const setConfig = (config: Partial<IConfig>) => {
  Object.assign(globalConfig, config)
}

export const getConfig = () => {
  return globalConfig
}
