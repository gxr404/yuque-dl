import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'

import type { Root, Parents, Nodes, Link } from 'mdast'

export function getAst(mdData: string) {
  return fromMarkdown(mdData)
}

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
