export default {
  knowledgeBaseReg: /decodeURIComponent\(\"(.+)\"\)\);/m,
  dist: './download'
}

// data = re.findall(r"decodeURIComponent\(\"(.+)\"\)\);", docsdata.content.decode('utf-8'))

// const config = {
//   path: '',
//   suffix: '',
//   dist: './res/',
//   imgDir:`./img/${Date.now()}`,
//   // markdown img 正则 注意多行匹配
//   mdImgReg: /!\[(.*?)\]\((.*?)\)/gm,
//   isIgnoreConsole: false
// }
