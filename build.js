const fs = require('fs');
const path = require('path');
const glob = require('glob');
const esbuild = require('esbuild');

esbuild.build({
	entryPoints: ['app.jsx'],
	bundle: true,
	outfile: 'dist/main.js',
	loader: { '.jsx': 'jsx' },
	platform: 'browser',
	format: 'iife',
	globalName: 'AppBundle',
	minify: true
}).then(() => {
	console.log('✅ Build Done: dist/main.js');
}).catch((err) => {
	console.error('❌ Build Error:', err.message);
	process.exit(1);
});
