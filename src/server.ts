import { createServer } from 'vitepress'
import { mkdir, writeFile, readFile, readdir, stat, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'

let restartPromise: Promise<void> | undefined

export async function runServer(root: string) {
  const rootPath = resolve(root)
  if (!await fileExists(rootPath)) {
    throw new Error('server root not found')
  }
  await createVitePressConfig(rootPath)
  const createDevServer = async () => {
    const server = await createServer(root, {}, async () => {
      if (!restartPromise) {
        restartPromise = (async () => {
          await server.close()
          await createDevServer()
        })().finally(() => {
          restartPromise = undefined
        })
      }

      return restartPromise
    })
    await server.listen()
    server.printUrls()
    // bindShortcuts(server, createDevServer)
  }

  await createDevServer().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

async function createVitePressConfig(root: string) {
  const bookName = root.split('/').filter(Boolean).at(-1) || 'yuque-dl'
  const vitepressPath = join(root, '/.vitepress')
  await mkdir(vitepressPath, {recursive: true})
  const vitePressConfig = join(vitepressPath, 'config.ts')
  const sidebar = await createSidebarMulti(root)
  const config = `
  export default {
    title: "${bookName}",
    themeConfig: {
      search: {
        provider: 'local'
      },
      sidebar: ${JSON.stringify(sidebar)}
    },
    vite: {
      optimizeDeps: {
        include: []
      }
    }
  }
  `
  await writeFile(vitePressConfig, config)
}

async function fileExists(filename: string) {
  try {
    await access(filename)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    } else {
      throw err
    }
  }
}

async function createSidebarMulti (path: string) {
  const data = [] as any
  const ignoreList = ['.vitepress', 'img', 'index.md', 'progress.json', 'attachments']
  let dirList = await readdir(path)
  dirList = dirList.filter(item => !ignoreList.includes(item))
  for (const n of dirList) {
    const dirPath = join(path, n)
    const statRes = await stat(dirPath)
    if (statRes.isDirectory()) {
      const isHasIndex = await fileExists(join(dirPath,'index.md'))
      const item: any = {
        text: n,
        collapsed: true,
        items: await createSideBarItems(path, n)
      }
      if (isHasIndex) item.link = `/${n}/`
      data.push(item)
    } else {
      data.push({
        text: n.slice(0, n.lastIndexOf('.')),
        link: `/${n}`
      })
    }
  }
  return data
}

// 尝试从一个md文件中读取标题，读取到第一个 ‘# 标题内容’ 的时候返回这一行
export async function getTitleFromFile (realFileName: string): Promise<string | undefined> {
  const isExist = await fileExists(realFileName)
  if (!isExist) {
    return undefined
  }
  const fileExtension = realFileName.substring(
    realFileName.lastIndexOf('.') + 1
  )
  if (fileExtension !== 'md' && fileExtension !== 'MD') {
    return undefined
  }
  // read contents of the file
  const data = await readFile(realFileName, { encoding: 'utf-8' })
  // split the contents by new line
  const lines = data.split(/\r?\n/)
  // return title
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2)
    }
  }
  return undefined
}

async function createSideBarItems (
  targetPath: string,
  ...reset: string[]
) {
  const collapsed = false
  const node = await readdir(join(targetPath, ...reset))

  const result = []
  for (const fname of node) {
    const curPath = join(targetPath, ...reset, fname)
    const statRes = await stat(curPath)
    if (statRes.isDirectory()) {
      const items = await createSideBarItems(join(targetPath), ...reset, fname)
      if (items.length > 0) {
        const sidebarItem: any = {
          text: fname,
          items
        }
        // vitePress sidebar option collapsed
        sidebarItem.collapsed = collapsed
        const isHasIndex = await fileExists(join(curPath, 'index.md'))
        if (isHasIndex) {
          sidebarItem.link = '/' + [...reset, fname].map(decodeURIComponent).join('/') + '/'
        }
        result.push(sidebarItem)
      }
    } else {
      // is filed
      if (
        fname === 'index.md' ||
        /^-.*\.(md|MD)$/.test(fname) ||
        !fname.endsWith('.md')
      ) {
        continue
      }
      const fileName = fname.replace(/\.md$/, '')
      const item = {
        text: fileName,
        link: '/' + [...reset.map(decodeURIComponent), `${encodeURI(fileName)}.html`].join('/')
      }
      result.push(item)
    }
  }
  return result
}
