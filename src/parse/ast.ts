import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'

import type { Root, Parents, Nodes, Link, InlineCode } from 'mdast'

export function getAst(mdData: string) {
  return fromMarkdown(mdData)
}
// TOOD: 多次Ast解析 优化??
// const cacheAstMap = new Map<string, Root>([])
// export function getAst(mdData: string, useCache = true) {
//   if (!useCache) return fromMarkdown(mdData)
//   if (cacheAstMap.get(mdData)) return cacheAstMap.get(mdData) as Root
//   const ast = fromMarkdown(mdData)
//   cacheAstMap.set(mdData, ast)
//   return ast
// }

export function toMd(astTree: Root) {
  return toMarkdown(astTree)
}

export interface ILinkItem {
  node: Link,
  keyChain: string[]
}

export function getLinkList(curNode: Root) {
  const linkList: ILinkItem[] = []
  eachNode(curNode, function(node, keyChain) {
    if (node.type === 'link') {
      linkList.push({
        node,
        keyChain
      })
    }
  })
  return linkList
}


export interface IInlinkCodeItem {
  node: InlineCode,
  keyChain: string[]
}

export function getInLineCodeList(curNode: Root) {
  const list: IInlinkCodeItem[] = []
  eachNode(curNode, function(node, keyChain) {
    if (node.type === 'inlineCode') {
      list.push({
        node,
        keyChain
      })
    }
  })
  return list
}

// const hasChildrenType = ['blockquote', 'code'] as const
// type THasChildrenType = typeof hasChildrenType[number]
// // type THasChildrenContent = Pick<RootContentMap, THasChildrenType>
// type THasChildrenContent = RootContentMap[THasChildrenType];
function eachNode(node: Nodes, callback: (node: Nodes, keyChain: string[]) => void, keyChain: string[] = []) {
  callback(node, keyChain)
  if (Array.isArray((node as Parents).children)) {
    // node.children
    keyChain.push('children')

    ;(node as Parents).children.forEach((node, index) => {
      // callback(node)
      // keyChain.push(String(index))
      eachNode(node, callback, [...keyChain, String(index)])
    })
  }
}
