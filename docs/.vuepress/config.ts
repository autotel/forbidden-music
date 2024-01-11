import { glob } from 'glob';
import { SidebarConfig, SidebarGroup, defaultTheme, defineUserConfig } from 'vuepress'
const sidebar: SidebarConfig = [];


glob.sync('docs/**/*.md')
    .map((path) => path.replace('docs/', ''))
    .sort()
    .forEach((path) =>
        path.split('/').forEach((name, index, array) => {
            let children = sidebar

            for (let i = 0; i < index; i++) {
                children = (
                    children.find(
                        (child) => typeof child === 'object' && child.text === array[i]
                    ) as SidebarGroup
                ).children
            }

            if (name === 'index.md' || name === 'README.md') {
                children.push(
                    `/${path
                        .replace('.md', '')
                        .replace('index', '')
                        .replace('README', '')}`
                )
                return
            }

            if (name.endsWith('.md')) {
                children.push(`/${path.replace('.md', '')}`)
                return
            }

            const child = children.find(
                (child) => typeof child === 'object' && child.text === name
            ) as SidebarGroup

            if (!child) {
                children.push({ text: name, children: [], collapsible: true })
            }
        })
    )


export default defineUserConfig({
    lang: 'en-UK',
    title: 'doc',
    description: 'Documentation for nondiscrete piano roll',
    theme: defaultTheme({
        docsDir: 'docs',
        sidebar,
    }),

});
