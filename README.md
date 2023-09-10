# scipdf-node <a href="https://www.npmjs.com/package/scipdf-node"><img align="right" src="https://badge.fury.io/js/yaml.svg" title="npm package" /></a>


参考 [scipdf-parser](https://pypi.org/project/scipdf-parser/) 实现

## To install:

```sh
npm install scipdf-node
```

## example

```js
import { ScipdfParser } from 'scipdf-node'
// or
const ScipdfParser = require('scipdf-node').ScipdfParser

const pdfsrc = 'url or pdf_file_path or Buffer or base64 string' 

ScipdfParser(pdfsrc, {
	grobid_url: [
		'https://qingxu98-grobid.hf.space', 
        'https://qingxu98-grobid2.hf.space', 
        'https://qingxu98-grobid3.hf.space',
		'https://shaocongma-grobid.hf.space', 
        'https://FBR123-grobid.hf.space', 
        'https://yeku-grobid.hf.space'
	],
	references: true, foot: true, table: true, section: true
}).then(r => {
	console.log(r.title)
	console.log(r.abstract)
    console.log(r.authors)
})

```
