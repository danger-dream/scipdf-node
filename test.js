import { ScipdfParser } from './dist';
ScipdfParser("/temp/pdf/2304.14233.pdf", {
    grobid_url: [
        'https://qingxu98-grobid.hf.space', 'https://qingxu98-grobid2.hf.space', 'https://qingxu98-grobid3.hf.space',
        'https://shaocongma-grobid.hf.space', 'https://FBR123-grobid.hf.space', 'https://yeku-grobid.hf.space'
    ],
    references: true, foot: true, table: true, section: true
}).then(r => {
    console.log(r.title, r.abstract, r.authors);
    console.log(r.abstract);
});
