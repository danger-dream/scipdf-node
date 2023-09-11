# scipdf-node


参考 [scipdf-parser](https://pypi.org/project/scipdf-parser/) 实现

## To install:

```sh
npm install scipdf-node
```

## example

```js
import { ScipdfParser } from 'scipdf-node'
// or
const { ScipdfParser } = require('scipdf-node')

const pdfsrc = 'url or pdf_file_path or Buffer or base64 string' 

ScipdfParser(pdfsrc, {
	grobid_url: [
		'https://qingxu98-grobid.hf.space', 
        'https://qingxu98-grobid2.hf.space', 
        'https://qingxu98-grobid3.hf.space',
		'https://shaocongma-grobid.hf.space', 
        'https://FBR123-grobid.hf.space', 
        'https://yeku-grobid.hf.space',
		'https://exaggerated-grobid.hf.space'
	],
	references: true, foot: true, table: true, section: true
}).then(r => {
	console.log(r.title)
	console.log(r.abstract)
    console.log(r.authors)
})

```

## proxy

- use cloudflare workers
```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const to_host_str = url.searchParams.get('to-host');
    if (!to_host_str) {
      return new Response('request headers not found key "to-host"', {
        status: 404
      })
    }
    url.searchParams.delete('to-host')
    url.host = to_host_str;

    const modifiedRequest = new Request(url, {
      headers: request.headers,
      method: request.method,
      body: request.body,
      redirect: 'follow'
    })

    const response = await fetch(modifiedRequest);
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return modifiedResponse;
  },
};
```

- invoke proxy

```js
import { ScipdfParser } from 'scipdf-node'
// or
const { ScipdfParser } = require('scipdf-node')

const pdfsrc = 'url or pdf_file_path or Buffer or base64 string' 

ScipdfParser(pdfsrc, {
	...,
    proxy: 'https://you cloudflare router url'
}).then(r => {
	console.log(r.title)
	console.log(r.abstract)
    console.log(r.authors)
})

```

## Duplicate grobid hf space

- open [https://huggingface.co/spaces/qingxu98/grobid](https://huggingface.co/spaces/qingxu98/grobid)
- click `duplicate this space` 
- set 'Visibility' to 'Public'
- click `duplicate space`
- wait for compilation
