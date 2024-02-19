export declare namespace ArticleResponse {
  interface RootObject {
    meta: Meta;
    data: Data;
  }

  interface Data {
    id: number;
    space_id: number;
    type: string;
    sub_type?: any;
    format: string;
    title: string;
    slug: string;
    public: number;
    status: number;
    read_status: number;
    created_at: string;
    content_updated_at: string;
    published_at: string;
    first_published_at: string;
    sourcecode: string;
    last_editor?: any;
    _serializer: string;
    content?: string
  }

  interface Meta {
    abilities: Abilities;
    latestReviewStatus: number;
  }

  interface Abilities {
    create: boolean;
    destroy: boolean;
    update: boolean;
    read: boolean;
    export: boolean;
    manage: boolean;
    join: boolean;
    share: boolean;
    force_delete: boolean;
    create_collaborator: boolean;
    destroy_comment: boolean;
  }
}

