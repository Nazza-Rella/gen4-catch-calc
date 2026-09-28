# web/ のテンプレートに build/ の素材を埋め込み、単一ファイルの HTML を作る
import base64, glob, json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
BUILD = os.path.join(ROOT, 'build')
WEB = os.path.join(ROOT, 'web')


def uri(path, mime='image/png'):
    return 'data:%s;base64,' % mime + base64.b64encode(open(path, 'rb').read()).decode()


assets = {'icons': uri(os.path.join(BUILD, 'icons.png'))}
for s in ('dp', 'pt', 'hg'):
    assets['sprites_' + s] = uri(os.path.join(BUILD, 'sprites_%s.png' % s))
for p in glob.glob(os.path.join(BUILD, 'bg', '*.png')):
    assets['bg_' + os.path.splitext(os.path.basename(p))[0]] = uri(p)
for p in glob.glob(os.path.join(BUILD, 'ui', '*.png')):
    assets[os.path.splitext(os.path.basename(p))[0]] = uri(p)
for p in glob.glob(os.path.join(BUILD, 'sfx', '*.wav')):
    assets['sfx_' + os.path.splitext(os.path.basename(p))[0]] = uri(p, 'audio/wav')

# リンクを貼ったときとタブのアイコン（モンスターボールのアイテム画像をドットのまま拡大）
ball = Image.open(os.path.join(BUILD, 'ui', 'ball_poke.png')).convert('RGBA')
ball = ball.crop(ball.getbbox())
icon = Image.new('RGBA', (256, 256), (70, 163, 82, 255))
big = ball.resize((ball.width * 9, ball.height * 9), Image.NEAREST)
icon.paste(big, ((256 - big.width) // 2, (256 - big.height) // 2), big)
icon.save(os.path.join(ROOT, 'icon.png'))
icon.resize((32, 32), Image.NEAREST).save(os.path.join(ROOT, 'favicon.png'))

data = json.load(open(os.path.join(BUILD, 'data.json'), encoding='utf-8'))
meta = json.load(open(os.path.join(BUILD, 'ui_meta.json'), encoding='utf-8'))
data['fontWidths'] = meta['fontWidths']
data['fontCodes'] = meta['fontCodes']
hp = json.load(open(os.path.join(BUILD, 'hbpal.json')))
data['hbpal'] = hp['hb']
data['hbpal_dp'] = hp['hb_dp']
pt = json.load(open(os.path.join(BUILD, 'particles.json')))
data['spa'] = pt['spa']
data['spaRects'] = pt['rects']
data['spaTexParam'] = pt['params']
html = open(os.path.join(WEB, 'app.html'), encoding='utf-8').read()
css = open(os.path.join(WEB, 'style.css'), encoding='utf-8').read()
js = open(os.path.join(WEB, 'app.js'), encoding='utf-8').read()
inject = 'window.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\nwindow.ASSETS=' + json.dumps(assets) + ';\n'
html = html.replace('/*__STYLE__*/', css).replace('/*__DATA__*/', inject).replace('/*__APP__*/', js)
open(os.path.join(BUILD, 'artifact.html'), 'w', encoding='utf-8').write(html)
NL = chr(10)
head = NL.join(['<!doctype html>', '<html lang="ja">', '<head>', '<meta charset="utf-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', '</head>', '<body>', ''])
out = os.path.join(ROOT, 'index.html')
open(out, 'w', encoding='utf-8').write(head + html + NL + '</body>' + NL + '</html>' + NL)
print(out, os.path.getsize(out))
