# rakuten-point-checker

Rakutenに自動ログインし、自動的にポイントを確認するスクリプト on Node.js

- 自動
- Combo解析モード搭載
- 1IPでもfingerprintを偽造してくれるので規制に強い
- 高速

Created by [@amex2189](https://twitter.com/amex2189)
機能追加要望はこちらまで

PayPay.js 等の他のツールは https://github.com/EdamAme-x

### install driver

`(p)npx puppeteer browsers install chrome`

### start

`(p)npm run start`

無断使用禁止

UserId はメルアド含む

tmp ファイルの中にcomboファイルを置くのがおススメです。

串を使う場合は、テキストファイル(名前は何でも良し)を作成して下さい。
形式はURLです。

```yaml
http://username:password@proxy.or.ip:1111

or

http://proxy.or.ip:1111

or

socks5://proxy.or.ip:1111
...
```