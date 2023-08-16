# yuque-dl

语雀知识库下载为本地markdown

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

- [x] 支持中断继续
- [x] 支持图片下载本地