npm install;
npm run build;
npm run docs:build;
mkdir ./forbidden-music/docs/;
cp ./docs/.vuepress/dist/* ./forbidden-music/docs/ -r;
echo "will run tests now, press ctrl+c to cancel";
sleep 5;
npm run test;