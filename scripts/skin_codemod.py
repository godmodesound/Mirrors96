#!/usr/bin/env python3
"""One-shot codemod: route every declared color through the SKIN layer.

 1. StyleSheet.create(  ->  skinStyles(          (lazily re-colored per skin)
 2. quoted color literals inside function/render bodies -> SK('...')
    (module-level data constants are left alone on purpose: those are
     semantic data colors, and they'd freeze at import time anyway)
"""
import re, sys, os

COLOR = re.compile(r'^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(|hsla?\()')


def transform(src: str):
    n = len(src)
    i = 0
    out = []          # list of (start, end, replacement)
    stack = []        # dicts: {'ch','func','style'}
    style_depth = 0
    func_depth = 0

    def tail():
        # last two non-space code chars before i
        j = len(code_chars) - 1
        buf = ''
        while j >= 0 and len(buf) < 8:
            c = code_chars[j]
            if not c.isspace():
                buf = c + buf
            j -= 1
        return buf

    code_chars = []
    creates = []

    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if two == '//':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if two == '/*':
            j = src.find('*/', i)
            i = n if j < 0 else j + 2
            continue
        if c == '`':
            # template literal: skip whole thing incl. nested ${ } expressions
            i += 1
            expr = []          # brace depth inside each ${ } level
            while i < n:
                if src[i] == '\\':
                    i += 2
                    continue
                if src[i:i + 2] == '${':
                    expr.append(0)
                    i += 2
                    continue
                if expr:
                    if src[i] == '{':
                        expr[-1] += 1
                    elif src[i] == '}':
                        if expr[-1] > 0:
                            expr[-1] -= 1
                        else:
                            expr.pop()
                    i += 1
                    continue
                if src[i] == '`':
                    i += 1
                    break
                i += 1
            code_chars.append('`')
            continue
        if c == '/' and two != '//' and two != '/*':
            prev = tail()
            if prev == '' or prev[-1] in '(,=:[!&|?{;+*%~^<>' or re.search(r'\breturn$', prev):
                # regex literal — skip it (may contain quotes)
                j = i + 1
                cls = False
                while j < n:
                    if src[j] == '\\':
                        j += 2
                        continue
                    if src[j] == '[':
                        cls = True
                    elif src[j] == ']':
                        cls = False
                    elif src[j] == '/' and not cls:
                        break
                    elif src[j] == '\n':
                        break
                    j += 1
                i = j + 1
                code_chars.append('r')
                continue
        if c in '"\'':
            prev = tail()
            # JSX text apostrophes (TODAY'S, don't) are not string starts
            if c == '\'' and prev and (prev[-1].isalnum() or prev[-1] in '._'):
                code_chars.append('x')
                i += 1
                continue
            q = c
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == q or src[j] == '\n':
                    break
                j += 1
            if j >= n or src[j] == '\n':
                # unterminated on this line -> not a real string literal
                code_chars.append('x')
                i += 1
                continue
            val = src[i + 1:j]
            if (style_depth == 0 and func_depth > 0 and COLOR.match(val)
                    and '\\' not in val and '$' not in val):
                # JSX attribute (name="#fff") needs braces around the call
                jsx = re.search(r'[A-Za-z_][\w:.\-]*=$', src[max(0, i - 40):i]) is not None
                rep = ("{SK('%s')}" if jsx else "SK('%s')") % val
                out.append((i, j + 1, rep))
            i = j + 1
            code_chars.append('"')
            continue
        if c in '({[':
            t = tail()
            is_func = c == '{' and (t.endswith('=>') or re.search(r'\)$', t) is not None)
            if c == '(' and t.endswith('=>'):
                is_func = True
            is_style = False
            if c == '(':
                pre = src[max(0, i - 20):i]
                if re.search(r'(StyleSheet\.create|skinStyles)\s*$', pre):
                    is_style = True
                    m = re.search(r'StyleSheet\.create\s*$', pre)
                    if m:
                        creates.append((max(0, i - 20) + m.start(), i))
            stack.append({'ch': c, 'func': is_func, 'style': is_style})
            if is_func:
                func_depth += 1
            if is_style:
                style_depth += 1
            code_chars.append(c)
            i += 1
            continue
        if c in ')}]':
            if stack:
                fr = stack.pop()
                if fr['func']:
                    func_depth -= 1
                if fr['style']:
                    style_depth -= 1
            code_chars.append(c)
            i += 1
            continue
        code_chars.append(c)
        i += 1

    for s, e in creates:
        out.append((s, e, 'skinStyles'))

    out.sort(key=lambda x: x[0])
    res = []
    prev = 0
    for s, e, rep in out:
        if s < prev:
            continue
        res.append(src[prev:s])
        res.append(rep)
        prev = e
    res.append(src[prev:])
    return ''.join(res), len(creates), sum(1 for o in out if 'SK(' in o[2])


def add_import(src: str, rel: str, names):
    if 'from \'%s\'' % rel in src:
        return src
    line = "import { %s } from '%s';\n" % (', '.join(names), rel)
    # after last top-level import statement
    last = 0
    for m in re.finditer(r'(?m)^import .*?;\s*$', src):
        last = m.end()
    if last == 0:
        return line + src
    return src[:last] + '\n' + line + src[last:]


def main(paths):
    for p in paths:
        src = open(p).read()
        new, nc, ns = transform(src)
        if nc == 0 and ns == 0:
            print('skip', p)
            continue
        names = []
        if nc:
            names.append('skinStyles')
        if ns:
            names.append('SK')
        rel = '../src/skins' if '/app/frontend/app/' in p else './skins'
        new = add_import(new, rel, names)
        open(p, 'w').write(new)
        print('%-44s create:%d inline:%d' % (os.path.basename(p), nc, ns))


if __name__ == '__main__':
    main(sys.argv[1:])
