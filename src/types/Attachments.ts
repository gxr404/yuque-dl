export declare namespace Attachments {
  interface IDownloadAttachments {
    mdData: string
    savePath: string
    attachmentsDir: string
    articleTitle: string
    token?: string
    key?: string
    cookie?: string
    ignoreAttachments?: boolean | string
  }

  interface IAttachmentsItem {
    fileName: string
    url: string
    rawMd: string
    currentFilePath: string
  }

}
