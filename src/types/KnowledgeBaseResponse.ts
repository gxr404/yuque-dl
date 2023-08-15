export declare namespace KnowledgeBase {
  interface Response {
    me: Me;
    notification: Notification;
    settings: Settings;
    env: string;
    space: Space;
    isYuque: boolean;
    isPublicCloud: boolean;
    isEnterprise: boolean;
    isUseAntLogin: boolean;
    defaultSpaceHost: string;
    timestamp: number;
    traceId: string;
    siteName: string;
    siteTip?: any;
    activityTip?: any;
    topTip?: any;
    readTip: Notification;
    questionRecommend?: any;
    dashboardBannerRecommend?: any;
    imageServiceDomains: string[];
    sharePlatforms: string[];
    locale: string;
    matchCondition: MatchCondition;
    empInfo: Notification;
    group: Group;
    book: Book;
    groupMemberInfo: GroupMemberInfo;
    userSettings: Notification;
    interest: Interest;
    canUseAiWriting: boolean;
    canUseAiLegal: boolean;
    canUseAiReading: boolean;
    aiWritingStreamType: any[];
    legalAnimationTime: number;
    canUseAiTag: boolean;
    canUseAiTestCase: boolean;
    paymentInfo: PaymentInfo;
    login: Login;
    enableCoverageDeploy: boolean;
    isDesktopApp: boolean;
    isOnlineDesktopApp: boolean;
    isIsomorphicDesktopApp: boolean;
    isAssistant: boolean;
    isAlipayApp: boolean;
    isDingTalkApp: boolean;
    isDingTalkMiniApp: boolean;
    isDingTalkDesktopApp: boolean;
    isYuqueMobileApp: boolean;
    tracertConfig: TracertConfig;
  }

  interface TracertConfig {
    spmAPos: string;
    spmBPos?: any;
  }

  interface Login {
    loginType: string;
    enablePlatforms: string[];
    isWechatMobileApp: boolean;
  }

  interface PaymentInfo {
    paymentBizInstId: string;
  }

  interface Interest {
    interests: Interests;
    limits: Limits;
    owner: Owner;
    limit: Member;
  }

  interface Owner {
    id: number;
    type: string;
    member_level: string;
    isTopLevel: boolean;
    isMemberTopLevel: boolean;
    isPaid: boolean;
    isExpired: boolean;
  }

  interface Limits {
    normal: Normal;
    member: Member;
  }

  interface Member {
    max_group_member_number: number;
    max_book_collaborator_number: number;
    max_book_number?: any;
    max_resource_total_size: number;
    max_single_file_size: number;
    max_single_image_size: number;
    max_single_video_size: number;
    max_doc_collaborator_number: number;
    max_doc_nologin_pv?: any;
  }

  interface Normal {
    max_group_member_number: number;
    max_book_collaborator_number: number;
    max_book_number: number;
    max_resource_total_size: number;
    max_single_image_size: number;
    max_single_video_size: number;
    max_single_file_size: number;
    max_doc_collaborator_number: number;
    max_doc_nologin_pv: number;
  }

  interface Interests {
    book_webhook: boolean;
    open_ocr: boolean;
    create_public_resource: boolean;
    book_statistics: boolean;
    book_security: boolean;
  }

  interface GroupMemberInfo {
    usage: Usage;
    expired_at: string;
    countDownDays: number;
    isAllowRenew: boolean;
    receipt?: any;
    groupOwners: GroupOwner[];
    hasOrder: boolean;
  }

  interface GroupOwner {
    id: number;
    type: string;
    login: string;
    name: string;
    description?: string;
    avatar?: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
    status: number;
    public: number;
    scene?: any;
    created_at: string;
    updated_at: string;
    expired_at?: string;
    isPaid: boolean;
    member_level: number;
    memberLevelName?: string;
    hasMemberLevel: boolean;
    isTopLevel: boolean;
    isNewbie: boolean;
    profile?: any;
    organizationUser?: any;
    _serializer: string;
  }

  interface Usage {
    attachment_size: number;
    image_size: number;
    video_size: number;
    attachment_size_month: number;
    image_size_month: number;
    video_size_month: number;
    max_upload_size: number;
    _serializer: string;
  }

  interface Book {
    id: number;
    type: string;
    slug: string;
    name: string;
    toc: Toc[];
    toc_updated_at: string;
    description: string;
    creator_id: number;
    menu_type: number;
    items_count: number;
    likes_count: number;
    watches_count: number;
    user_id: number;
    abilities: Abilities2;
    public: number;
    extend_private: number;
    scene?: any;
    source?: any;
    created_at: string;
    updated_at: string;
    pinned_at?: any;
    archived_at?: any;
    layout: string;
    doc_typography: string;
    doc_viewport: string;
    announcement?: any;
    should_manually_create_uid: boolean;
    catalog_tail_type: string;
    catalog_display_level: number;
    cover: string;
    comment_count?: any;
    organization_id: number;
    status: number;
    indexed_level: number;
    privacy_migrated: boolean;
    collaboration_count: number;
    content_updated_at: string;
    content_updated_at_ms: number;
    copyright_watermark: string;
    enable_announcement: boolean;
    enable_auto_publish: boolean;
    enable_comment: boolean;
    enable_document_copy: boolean;
    enable_export: boolean;
    enable_search_engine: boolean;
    enable_toc: boolean;
    enable_trash: boolean;
    enable_visitor_watermark: boolean;
    enable_webhook: boolean;
    image_copyright_watermark: string;
    original: number;
    resource_size: number;
    user?: any;
    contributors?: any;
    _serializer: string;
  }

  interface Abilities2 {
    create_doc: boolean;
    destroy: boolean;
    export: boolean;
    export_doc: boolean;
    read: boolean;
    read_private: boolean;
    update: boolean;
    create_collaborator: boolean;
    manage: boolean;
    share: boolean;
    modify_setting: boolean;
  }

  interface Toc {
    type: string;
    title: string;
    uuid: string;
    url: string;
    prev_uuid: string;
    sibling_uuid: string;
    child_uuid: string;
    parent_uuid: string;
    doc_id: number;
    level: number;
    id: number;
    open_window: number;
    visible: number;
  }

  interface Group {
    id: number;
    type: string;
    login: string;
    name: string;
    description: string;
    avatar: string;
    avatar_url: string;
    owner_id: number;
    books_count: number;
    public_books_count: number;
    topics_count: number;
    public_topics_count: number;
    members_count: number;
    abilities: Abilities;
    settings: Settings2;
    public: number;
    extend_private: number;
    scene?: any;
    created_at: string;
    updated_at: string;
    expired_at: string;
    deleted_at?: any;
    organization_id: number;
    isPaid: boolean;
    member_level: number;
    memberLevelName: string;
    hasMemberLevel: boolean;
    isTopLevel: boolean;
    grains_sum: number;
    status: number;
    source?: any;
    zone_id: number;
    isPermanentPunished: boolean;
    isWiki: boolean;
    isPublicPage: boolean;
    organization?: any;
    owners?: any;
    _serializer: string;
  }

  interface Settings2 {
    homepage: Homepage;
    navigation: string[];
    group: Notification;
    id: number;
    created_at: string;
    updated_at: string;
    space_id: number;
    group_id: number;
    topic_enable: number;
    resource_enable: number;
    thread_enable: number;
    issue_enable: number;
    role_for_add_member: number;
    external_enable: number;
    permission: Permission;
  }

  interface Permission {
    create_member: boolean;
    create_book: boolean;
    create_book_collaborator: boolean;
    modify_book_setting: boolean;
    share_book: boolean;
    export_book: boolean;
    share_doc: boolean;
    export_doc: boolean;
    force_delete_doc: boolean;
  }

  interface Homepage {
    layout: Layout;
    version: number;
  }

  interface Layout {
    header: string[];
    content: string[];
    aside: string[];
  }

  interface Abilities {
    create_book: boolean;
    create_member: boolean;
    destroy: boolean;
    read: boolean;
    read_private: boolean;
    update: boolean;
    manage: boolean;
    restore: boolean;
  }

  interface MatchCondition {
    page: string;
  }

  interface Space {
    id: number;
    login: string;
    name: string;
    short_name?: any;
    status: number;
    account_id: number;
    logo?: any;
    description: string;
    created_at?: any;
    updated_at?: any;
    host: string;
    displayName: string;
    logo_url: string;
    enable_password: boolean;
    enable_watermark: boolean;
    _serializer: string;
  }

  interface Settings {
    allowed_link_schema: string[];
    enable_link_interception: boolean;
    enable_new_user_public_ability_forbid: boolean;
    user_registry_forbidden_level: string;
    watermark_enable: string;
    public_space_doc_search_enable: boolean;
    lake_enabled_groups: string;
    image_proxy_root: string;
    max_import_task_count: number;
    enable_search: boolean;
    enable_serviceworker: boolean;
    enable_lazyload_card: string;
    editor_canary: Editorcanary;
    enable_attachment_multipart: boolean;
    enable_custom_video_player: boolean;
    conference_gift_num: number;
    intranet_safe_tip: string[];
    publication_enable_whitelist: any[];
    foreign_phone_registry_enabled_organization_whitelist: string[];
    disabled_login_modal_pop_default: boolean;
    enable_open_in_mobile_app: boolean;
    enable_wechat_guide_qrcode: boolean;
    enable_issue: boolean;
    enable_blank_page_detect: boolean;
    zone_ant_auth_keepalive_enabled_domains: any[];
    enable_new_group_page_whitelist: any[];
    enable_web_ocr: Enablewebocr;
    customer_staff_dingtalk_id: string;
    enable_desktop_force_local: boolean;
    support_extension_download_url: boolean;
  }

  interface Enablewebocr {
    enable: boolean;
    enableBrowsers: string[];
    _users: number[];
    percent: number;
  }

  interface Editorcanary {
    card_lazy_init: number;
    retryOriginImage: number;
  }

  interface Notification {
  }

  interface Me {
    avatar_url: string;
    avatar: string;
    language: string;
    is_admin: boolean;
  }
}
