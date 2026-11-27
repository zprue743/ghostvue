import { execFileSync } from 'node:child_process'
import { repository } from './release-scope.mjs'

export function api(path, body, { method, project } = {}) {
  const args = ['api', path]
  if (method) args.push('--method', method)
  if (body) args.push('--input', '-')
  const env = { ...process.env }
  if (project && env.RELEASE_PROJECT_TOKEN)
    env.GH_TOKEN = env.RELEASE_PROJECT_TOKEN
  const result = execFileSync('gh', args, {
    encoding: 'utf8',
    input: body && JSON.stringify(body),
    env,
    maxBuffer: 32 * 1024 * 1024,
  })
  return result.trim() ? JSON.parse(result) : null
}

const pageFields = 'pageInfo { hasNextPage endCursor } totalCount'
function pages(query, variables, select, project = false) {
  const nodes = []
  let after = null
  do {
    const response = api(
      'graphql',
      { query, variables: { ...variables, after } },
      { project },
    )
    if (response.errors?.length)
      throw new Error('Incomplete GitHub GraphQL response')
    const page = select(response.data)
    if (!page || page.nodes.some((node) => !node))
      throw new Error('Unreadable GitHub connection')
    nodes.push(...page.nodes)
    if (!page.pageInfo.hasNextPage) {
      if (nodes.length !== page.totalCount)
        throw new Error('GitHub inventory changed during pagination')
      return nodes
    }
    if (!page.pageInfo.endCursor || after === page.pageInfo.endCursor)
      throw new Error('Missing GitHub page cursor')
    after = page.pageInfo.endCursor
  } while (after)
}

const repoQuery = 'repository(owner:"zprue743",name:"ghostvue")'
function repoPages(field, args, fields) {
  return pages(
    `query($after:String){${repoQuery}{${field}(${args},first:50,after:$after){${pageFields} nodes{${fields}}}}}`,
    {},
    (data) => data.repository[field],
  )
}

// Common case uses the first nested page already fetched with its parent.
function complete(node, type, field, selection) {
  const connection = node[field]
  if (
    connection.nodes.length === connection.totalCount &&
    connection.nodes.every(Boolean)
  )
    return connection.nodes
  return pages(
    `query($id:ID!,$after:String){node(id:$id){...on ${type}{${field}(first:100,after:$after){${pageFields} nodes{${selection}}}}}}`,
    { id: node.id },
    (data) => data.node[field],
  )
}

export function pullRequests() {
  const refFields = 'number url repository{nameWithOwner}'
  return repoPages(
    'pullRequests',
    'states:OPEN,baseRefName:"master"',
    `id number body author{__typename login} headRefName headRefOid headRepository{nameWithOwner} closingIssuesReferences(first:100){totalCount nodes{${refFields}}}`,
  ).map((pr) => ({
    ...pr,
    links: complete(pr, 'PullRequest', 'closingIssuesReferences', refFields),
  }))
}

export function openIssues() {
  return repoPages(
    'issues',
    'states:OPEN',
    'id number body labels(first:100){totalCount nodes{name}} assignees{totalCount} issueDependenciesSummary{blockedBy}',
  ).map((issue) => ({
    ...issue,
    labels: complete(issue, 'Issue', 'labels', 'name').map(
      (label) => label.name,
    ),
  }))
}

export function board(active) {
  const projectQuery = 'user(login:"zprue743"){projectV2(number:5)'
  const field = '...on ProjectV2SingleSelectField {options{name}}'
  const metadata = api(
    'graphql',
    {
      query: `{${projectQuery}{target:field(name:"Target release"){${field}} status:field(name:"Status"){${field}}}}}`,
    },
    { project: true },
  ).data.user.projectV2
  if (
    !metadata?.target?.options?.some((o) => o.name === active) ||
    !metadata.status?.options?.some((o) => o.name === 'Todo')
  )
    throw new Error('Cannot verify active release or Status on execution board')
  const value = '...on ProjectV2ItemFieldSingleSelectValue{name}'
  const items = pages(
    `query($after:String){${projectQuery}{items(first:100,after:$after){${pageFields} nodes{type isArchived content{__typename ...on Issue{number repository{nameWithOwner}}} target:fieldValueByName(name:"Target release"){${value}} status:fieldValueByName(name:"Status"){${value}}}}}}}`,
    {},
    (data) => data.user.projectV2.items,
    true,
  )
  const cards = new Map()
  for (const item of items) {
    if (item.type === 'REDACTED' || !item.content)
      throw new Error('Execution board contains unreadable items')
    if (
      item.isArchived ||
      item.content.__typename !== 'Issue' ||
      item.content.repository.nameWithOwner !== repository
    )
      continue
    // GraphQL returns null for a verified empty field. A missing field or a
    // different field type cannot justify withdrawing a live ready label.
    for (const field of ['target', 'status']) {
      if (item[field] !== null && typeof item[field]?.name !== 'string')
        throw new Error('Incomplete execution board field data')
    }
    cards.set(item.content.number, {
      target: item.target?.name,
      status: item.status?.name,
    })
  }
  return cards
}
