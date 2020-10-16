const fs = require('fs');
const config = require('./config')

let collectRouterInfo = {};
let collectPageInfo = {};
let currentModuleName = '';



function getCurrentModuleName(modulePath){
    currentModuleName = '';
    if (fs.existsSync(modulePath)) {
        let _configContent = fs.readFileSync(modulePath, 'utf-8')
        let lines = _configContent.split('\n');
        for (var i = 0; i < lines.length; i++) {
            let regex = /(?<=key: ')\w*/;
            if (regex.test(lines[i])) {
                currentModuleName = lines[i].match(regex)[0];
                break;
            }
        }
    } else {
        console.log(modulePath + '文件不存在');
    }
}

// 收集引用外部组件信息
function collectExInfo(module, component, currentFileName, allModulesKeyWord, allModulesKeyAry) {
    // 外部引用
    if (currentModuleName !== module) {
        // 路由中外部引用组件
        if (currentFileName === 'router.js') {
            let index = allModulesKeyAry.indexOf(module.toLowerCase());
            if(index !== -1) {
                let key = allModulesKeyWord[index];
                if (!collectRouterInfo[key]) {
                    collectRouterInfo[key] = [];
                }
                collectRouterInfo[key].push(component);
            }
        } else {  // 页面中外部引用组件
            let index = allModulesKeyAry.indexOf(module.toLowerCase());
            if(index !== -1) {
                let key = allModulesKeyWord[index];
                if (!collectPageInfo[key]) {
                    collectPageInfo[key] = [];
                }
                collectPageInfo[key].push(component);
            }
        }
    }
}

function writeInfo() {
    let routerInfoStr = [];
    let pageInfoStr = [];
    let index = 1;
    for (const key in collectRouterInfo) {
        let componentsList = '';
        if (collectRouterInfo.hasOwnProperty(key)) {
            const componentsAry = [...new Set(collectRouterInfo[key])]; // 增加数组去重
            let newAry = componentsAry.map(component => {
                return ' - ' + component;
            });
            componentsList = newAry.join('\n');
        }
        let routerTemplate = `
${index}. 路由中存在${config[key]}子项目\`${key}\`中导出的组件，组件名如下：
${componentsList}`;
        routerInfoStr.push(routerTemplate);
        index ++;
    }
    index = 1;
    for (const key in collectPageInfo) {
        let componentsList = '';
        if (collectPageInfo.hasOwnProperty(key)) {
            const componentsAry = [...new Set(collectPageInfo[key])]; // 增加数组去重
            let newAry = componentsAry.map(component => {
                return ' - ' + component;
            });
            componentsList = newAry.join('\n');
        }
        let routerTemplate = `
${index}. 组件中引入了${config[key]}子项目\`${key}\`中导出的组件，组件名如下：
${componentsList}`;
        pageInfoStr.push(routerTemplate);
        index ++;
    }
    writeFile(routerInfoStr, pageInfoStr); 
}

function checkCollectInfo() {
   return  (Object.keys(collectPageInfo).length !== 0) || (Object.keys(collectRouterInfo).length !== 0)
}

function writeFile(routerInfoStr, pageInfoStr){
let data = ['\n## 依赖限制    '];
    if (routerInfoStr.length > 0) {
        data.push(`
### 路由文件router.js中引入其他子项目组件
${routerInfoStr.join('\n')}
`);
}
    if(pageInfoStr.length > 0) {
        data.push(`
### 组件中引入其他子项目组件
${pageInfoStr.join('\n')}
`);
}
if (routerInfoStr.length === 0 && pageInfoStr.length === 0) {
    data.push('无');
}
console.log(data.join('\n'));
}

module.exports = {
    getCurrentModuleName,
    collectExInfo,
    checkCollectInfo,
    writeInfo
}