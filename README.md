# yuque-dl

语雀知识库下载为本地markdown

![header](https://socialify.git.ci/gxr404/yuque-dl/image?description=1&descriptionEditable=%E8%AF%AD%E9%9B%80%E7%9F%A5%E8%AF%86%E5%BA%93%E4%B8%8B%E8%BD%BD&issues=1&logo=https%3A%2F%2Fraw.githubusercontent.com%2Fgxr404%2Fyuque-dl%2Fmain%2Fassets%2Flogo.png&name=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Light)

## Install

```bash
npm i -g yuque-dl
```

## Usage

```bash
$ yuque-dl --help

  Usage:
    $ yuque-dl <url>

  Commands:
    <url>  语雀知识库url

  For more info, run any command with the `--help` flag:
    $ yuque-dl --help

  Options:
    -d, --distDir <dir>  下载的目录 eg: -d download (default: download)
    -i, --ignoreImg      忽略图片不下载 (default: false)
    -v, --key <key>      指定语雀的 cookie key，默认是 "_yuque_session"
    -t, --token <token>  语雀的cookie key 对应的值
    -h, --help           Display this message
    -v, --version        Display version number
```

### Start

```bash
# url 为对应需要的知识库地址
yuque-dl "https://www.yuque.com/yuque/thyzgp"
```

## Example

![demo](./assets/demo.gif)

## 私有知识库

通过别人私有知识库 分享的链接，需使用`-t`添加token才能下载

```bash
yuque-dl "https://www.yuque.com/yuque/thyzgp" -t "abcd..."
```

[token的获取请看](./GET_TOEKN.md)

## Feature

- [x] 支持下载中断继续
- [x] 支持图片下载本地
- [x] 支持下载分享私有的知识库

## Tips

由于网络波动下载失败的，重新运行即可，已下载的进度不会受到影响
