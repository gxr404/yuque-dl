export declare namespace Video {
  interface IDownloadVideo {
    mdData: string
    htmlData: string
    savePath: string
    attachmentsDir: string
    articleTitle: string
    token?: string
    key?: string
    ignoreAttachments:  boolean | string
  }

  interface IGetVideoApiParams {
    videoId: string,
    token?: string,
    key?: string,
  }

  interface IGetVideoApiResponse {
    data: {
      status: string,
      info: IGetVideoApiInfo
    }
  }
  interface IGetVideoApiInfo {
    type: string,
    cover?: string,
    // video 特有
    video: string,
    // audio 特有
    audio: string,
    origin: string,
    state: number
  }


  interface IGetVideoItem{
    status: string,
    audioId: string,
    videoId: string
    // audio 对应的是filename video对应的是name
    fileName: string,
    name: string,
    fileSize: number,
    id: string
  }
}