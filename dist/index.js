import { existsSync, readFileSync } from 'node:fs';
import { DOMParser, XMLSerializer } from 'xmldom';
import { useNamespaces } from 'xpath';
export async function ScipdfParser(pdf_src, options) {
    if (!pdf_src) {
        throw new Error('file not found');
    }
    if (!options.grobid_url || (Array.isArray(options.grobid_url) && options.grobid_url.length === 0)) {
        throw new Error('grobid_url is required');
    }
    options = Object.assign({
        grobid_url: '', references: false, foot: false, table: false, section: true, retry: 5
    }, options || {});
    let url;
    if (Array.isArray(options.grobid_url)) {
        url = options.grobid_url[Math.floor(Math.random() * options.grobid_url.length)];
    }
    else {
        url = options.grobid_url;
    }
    let buf;
    if (Buffer.isBuffer(pdf_src)) {
        buf = pdf_src;
    }
    else {
        if (pdf_src.startsWith('http')) {
            const resp = await fetch(pdf_src, { method: 'GET' });
            buf = Buffer.from(await resp.arrayBuffer());
        }
        else if (existsSync(pdf_src)) {
            buf = readFileSync(pdf_src);
        }
        else {
            try {
                buf = Buffer.from(pdf_src, 'base64');
            }
            catch {
                throw new Error('unrecognized source');
            }
        }
    }
    const blob = new Blob([buf]);
    const body = new FormData();
    body.set('input', blob, 'temp.pdf');
    body.set('consolidateHeader', '1');
    body.set('consolidateCitations', '0');
    const retry = options.retry ?? 5;
    for (let index = 0; index < retry; index++) {
        const resp = await fetch(url + '/api/processFulltextDocument', {
            method: 'POST',
            body: body
        });
        if (resp.status === 503) {
            await (new Promise(r => setTimeout(r, 500)));
            continue;
        }
        else if (resp.status !== 200) {
            throw new Error('failed to parse');
        }
        return parseTEIXml(await resp.text(), options);
    }
    throw new Error('failed to parse');
}
function parseTEIXml(xml, options) {
    const article = {
        title: '',
        authors: [],
        orgs: [],
        pub_date: '',
        abstract: '',
        sections: [],
        references: []
    };
    xml = xml.replaceAll('xmlns=', 'pxmlns=').replaceAll('xml:id=', 'ref_id=');
    let ind1 = xml.indexOf('<teiHeader');
    if (ind1 < 0)
        throw new Error('failed to parse');
    let doc = new DOMParser().parseFromString(xml.substring(ind1, xml.indexOf('</teiHeader>') + 12));
    const select = useNamespaces({});
    const selectSingle = (exp, attr) => {
        const el = select(exp, doc, true);
        if (el) {
            return ((attr ? el.getAttribute(attr) : el.textContent) || '').trim();
        }
        return '';
    };
    const selectNodes = (exp) => select(exp, doc, false);
    article.title = selectSingle('//titleStmt/title');
    article.authors = selectNodes('//author/persName').map(item => child2Array(item).map(x => (x.textContent || '').trim()).filter(Boolean).join(' '));
    article.orgs = selectNodes('//affiliation/orgName').map(item => (item.textContent || '').trim()).filter(Boolean);
    article.pub_date = selectSingle('//publicationStmt/date', 'when');
    article.abstract = selectSingle('//abstract');
    ind1 = xml.indexOf('<text');
    if (ind1 < 0) {
        return article;
    }
    doc = new DOMParser().parseFromString(xml.substring(ind1, xml.indexOf('</text>') + 7));
    let foot_replace_text = '';
    for (const item of selectNodes('//body/*')) {
        try {
            if (item.nodeName === 'div') {
                if (!options.section) {
                    continue;
                }
                const childNodes = child2Array(item);
                let el = childNodes.find(x => x.nodeName === 'head');
                const childNotHeads = childNodes.filter(x => x.nodeName && x.nodeName !== 'head');
                article.sections.push({
                    n: el ? (el.getAttribute('n') || '') : '',
                    text: getNodeText(childNotHeads),
                    title: el ? (el.textContent || '').trim() : ''
                });
            }
            else if (item.getAttribute('place') === 'foot') {
                if (!item.getAttribute('n')) {
                    foot_replace_text = item.textContent || '';
                }
                else {
                    if (!options.foot)
                        continue;
                    article.sections.push({ n: '-', text: item.textContent || '', title: '-' });
                }
            }
            else if (item.nodeName === 'figure' && item.getAttribute('type') === 'table' && item.getAttribute('ref_id')) {
                if (!options.table)
                    continue;
                const sub = child2Array(item);
                let table_temp = sub.find(x => x.nodeName === 'table');
                if (!table_temp)
                    continue;
                const context = cell2text(table_temp);
                if (!context)
                    continue;
                article.sections.push({
                    n: '-',
                    text: [sub.find(x => x.nodeName === 'figdesc')?.textContent || '', context].filter(Boolean).join('\n\n'),
                    title: sub.find(x => x.nodeName === 'head')?.textContent || ''
                });
            }
        }
        catch {
        }
    }
    article.sections = article.sections.filter(x => (x.text || '').trim());
    if (foot_replace_text) {
        article.sections.forEach(x => x.text = x.text.replaceAll(foot_replace_text, '').trim());
        article.title = article.title.replaceAll(foot_replace_text, '').trim();
    }
    if (!options.references) {
        return article;
    }
    for (const node of selectNodes('//listBibl/biblStruct')) {
        try {
            doc = new DOMParser().parseFromString(new XMLSerializer().serializeToString(node));
            let title = selectSingle('//title[@level="a"]') || selectSingle('//title[@level="m"]');
            if (!title)
                continue;
            let journal_text = selectSingle('//title[@level="j"]') || selectSingle('//publisher');
            const authors = [];
            for (const item of selectNodes('//author')) {
                const pers = child2Array(item).find(x => x.nodeName === 'persName');
                if (pers) {
                    const author = child2Array(pers).map(x => x.textContent || '').filter(Boolean).join(' ');
                    author && authors.push(author.trim());
                }
            }
            let year = selectSingle('//date', 'when');
            let url = selectSingle('//ptr[@target]', 'target');
            let doi = selectSingle('//idno[@type="DOI"]');
            article.references.push({
                title,
                journal: journal_text,
                authors,
                year,
                url,
                doi
            });
        }
        catch {
        }
    }
    return article;
}
function child2Array(node) {
    return node.childNodes ? Object.keys(node.childNodes).map(n => node.childNodes[n]) : [];
}
function cell2text(node, list = []) {
    for (const item of child2Array(node)) {
        if (item.nodeName === 'row') {
            cell2text(item, list);
        }
        else {
            list.push(item.textContent || '');
        }
    }
    return list.filter(x => (x || '').trim()).join('\n');
}
function getNodeText(nodes) {
    let text = '';
    for (const node of nodes) {
        if (['formula'].includes(node.nodeName))
            continue;
        if (node.nodeName === 'ref') {
            const type = node.getAttribute('type') || '';
            if (type === 'formula' || type === 'bibr')
                continue;
            if (['table', 'foot', 'figure'].includes(type)) {
                text += node.textContent;
            }
            continue;
        }
        if (node.nodeName === 'p') {
            text += getNodeText(child2Array(node)) + '\n\n';
        }
        else if (node.nodeName === '#text') {
            text += (node.data || '').trim();
        }
    }
    return text;
}
