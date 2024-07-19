

current_branch=$(git branch --show-current);

read -p "Will merge $current_branch into main. Press y to continue" -n 1 -r
echo    # move to a new line


if [[ $REPLY =~ ^[Yy]$ ]]
then

git checkout main;
git pull;
git merge $current_branch;
git push;

npm install;
npm run build;

npm run docs:build;
mkdir ./forbidden-music/docs/;
cp ./docs/.vuepress/dist/* ./forbidden-music/docs/ -r;
echo "will run tests now, press ctrl+c to cancel";
sleep 5;
npm run test;

git checkout $current_branch;

fi