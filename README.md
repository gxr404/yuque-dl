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
    <url>  request url

  For more info, run any command with the `--help` flag:
    $ yuque-dl --help

  Options:
    -d, --distDir <dir>  下载的目录 eg: -d download (default: download)
    -i, --ignoreImg      忽略图片不下载 (default: false)
    -h, --help           Display this message
    -v, --version        Display version number
```

## Example

![demo](./assets/demo.gif)

## Feature

- [x] 支持下载中断继续
- [x] 支持图片下载本地
