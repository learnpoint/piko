import { yamlParse } from "../deps.js";

const matcher = /^---([\s\S]*)^---$([\s\S]*)/m;

export function parse(text) {
    if (!matcher.test(text)) {
        return {
            data: {},
            content: text,
        };
    }

    const [_, yaml, content] = text.match(matcher);

    return {
        data: yamlParse(yaml.trim()),
        content: content.trim(),
    };
}