export declare namespace Attachments {
  interface IDownloadAttachments {
    mdData: string
    savePath: string
    attachmentsDir: string
    articleTitle: string
    token?: string
    key?: string
    ignoreAttachments?: boolean | string
  }

  interface IAttachmentsItem {
    fileName: string
    url: string
    rawMd: string
    currentFilePath: string
  }

}