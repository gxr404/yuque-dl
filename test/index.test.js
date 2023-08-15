// 'decodeURIComponent("xxx"));'.match(/decodeURIComponent\(\"(.+)\"\)\);/m)


// const {run} = require('../dist/index.js')

// const config = {
//   dist: 'test/dist/',
//   imgDir: './img/run_test',
//   isIgnoreConsole: true
// }
// test('run test', () => {
//   const mdData = `![](https://www.baidu.com/img/PCfb_5bf082d29588c07f842ccde3f97243ea.png)`

//   return run(mdData, config).then(data => {
//     expect(data).toMatch(/\!\[\]\(\.\/img\/run_test\/PCfb_5bf082d29588c07f842ccde3f97243ea-\d{6}\.png\)/)
//   })
// })