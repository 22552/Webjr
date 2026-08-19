WebjrExtensions.register({
    id: 'example',
    name: 'Example Extension',
    version: '1.0.0',
    theme: 'purple',
    blocks: [
        {
            opcode: 'log-text',
            label: 'text',
            icon: 'T',
            description: '入力した文字列をブラウザのコンソールに表示します',
            arg: {type: 'text', default: 'hello'},
            run: function (ctx) {
                console.log('[Webjr extension]', ctx.arg); // eslint-disable-line no-console
            }
        },
        {
            opcode: 'opacity',
            label: 'opacity',
            icon: '%',
            description: 'スプライトの透明度を0〜100で変更します',
            arg: {type: 'number', default: 100, min: 0, max: 100},
            run: function (ctx) {
                var value = Math.max(0, Math.min(100, Number(ctx.arg)));
                ctx.sprite.div.style.opacity = value / 100;
            }
        }
    ]
});
