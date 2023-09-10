/// <reference types="node" />
interface ScipdfOptions {
    /**
     *  the grobid url
     */
    grobid_url: string | string[];
    /**
     * whether to parse the section
     * @default true
     */
    section?: boolean;
    /**
     * whether to parse the references
     * @default false
     */
    references?: boolean;
    /**
     * whether to parse the foot
     * @default false
     */
    foot?: boolean;
    /**
     * whether to parse the table
     * @default false
     */
    table?: boolean;
    /**
     * retry number
     * @default 5
     */
    retry?: number;
}
export interface ScipdfArticleSection {
    n: string;
    text: string;
    title: string;
}
export interface ScipdfArticleReference {
    title: string;
    journal: string;
    authors: string[];
    year: string;
    url: string;
    doi: string;
}
interface ScipdfArticle {
    title: string;
    authors: string[];
    orgs: string[];
    pub_date: string;
    abstract: string;
    sections: ScipdfArticleSection[];
    references: ScipdfArticleReference[];
}
export declare function ScipdfParser(pdf_src: string | Buffer, options: ScipdfOptions): Promise<ScipdfArticle>;
export {};
