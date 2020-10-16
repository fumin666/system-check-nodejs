const config = require('./config')
const fs = require('fs');
var path = require('path');
const readline = require('readline');
const readmeInfo = require('./readmeInfo');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 所有模块组件信息
let allModules = {};
let allModulesListAry = [];
let allModulesKeyWord = [];
let checkResult = [];
let currentFileName = '';
let allModulesKeyAry = [];
// 文件错误信息
let hasFileError = false;
// 获取某一模块内部所有组件
function getOneModuleComponents(moduleUrl) {
    let _configContent = fs.readFileSync(moduleUrl, 'utf-8')
    let lines = _configContent.split('\n');
    let regex = /(?<=^').*?(?=')/g;
    let resultAry = [];
    let moduleRegex = /(?<=^key\:.\s*')\w*(?=')/g;
    let moduleName = null;
    // 匹配文件
    let regexVue = /(?<=import\(')[\.\w\-\/]*(?='\))/;
    for (var i = 0; i < lines.length; i++) {
        // 匹配组件
        if(regex.test(lines[i].trim())){
            resultAry.push(lines[i].trim().match(regex)[0]);
        }
        // 匹配模块名
        if(moduleRegex.test(lines[i].trim())){
            moduleName = lines[i].trim().match(moduleRegex)[0]
        }
        if (regexVue.test(lines[i].trim())) {
            let [filename] = lines[i].trim().match(regexVue);
            let pageUrlSubStr = filename.replace(/.vue/, '').replace(/.\//, '');
            let vueFilePath = moduleUrl.replace(/index.js/, pageUrlSubStr+ '.vue');
            // 不存在或者错误使用文件检查
            if (!fs.existsSync(vueFilePath)) {
                console.log('❌ ' + filename + '文件不存在, 或者该文件不是vue组件');
                hasFileError = true;
            }
        }
    }
    allModules[moduleName] = resultAry;
}

// 获取所有模块和组件数据
function readAllModuleFile() {
    console.log('-----开始获取所有功能内组件-----');
    let index = 1;
    for (const key in config) {
        if (config.hasOwnProperty(key)) {
            console.log(`${config[key]}功能内组件分析`);
            allModulesKeyWord.push(key);
            allModulesKeyAry.push(key.split('-').slice(1,key.split('-').length - 1).join(''));
            allModulesListAry.push(`\t${index}. ${config[key]}功能`);
            getOneModuleComponents(`../${key}/src/index.js`)
            index ++;
        }
    }
    console.log('-----所有功能内组件获取完毕-----');
}

// getOneModuleComponents('../sicap-log-center-page/src/index.js')
// getOneModuleComponents('../sicap-account-manage-page/src/index.js');
// console.log(allModules);
// 监测一行代码
// let oneLine = "let newScanDialog = getComponentByName('assetsMonitor', 'assetsMonitor-NewScanDialog', true)";
function checkVueOneline(oneLine){
    let regex = /(?<=getComponentByName\()'\w*', '[\w\-\/]*'(?=, true)/;
    if (regex.test(oneLine)) {
        let [module, component] = oneLine.match(regex)[0].replace(/\'/g, '').replace(' ', '').split(',');
        checkAction(module, component);
    }
}

// 监测一行代码
// let oneLine = "component: 'systemSet/home_systemSet'";
function checkRouterOneline(oneLine){
    let regex = /(?<=component: ')[\w\-\/]*/;
    if (regex.test(oneLine)) {
        let [module, component] = oneLine.match(regex)[0].split('/');
        if (module !== 'Home' && module !== 'Wrapper') {
            checkAction(module, component);
        }
    }
}

// 监测操作
function checkAction(module, component){
    if (allModules[module]) {
        if(allModules[module].indexOf(component) === -1) {
            checkResult.push(`❌ 没有在模块${module}下找到组件${component}--${currentFileName}`);
        } else {
            checkResult.push(`✅ 在模块${module}下匹配到组件${component}--${currentFileName}`);
            readmeInfo.collectExInfo(module, component, currentFileName, allModulesKeyWord, allModulesKeyAry);
        }
    } else {
        checkResult.push(`❌ 没有找到模块${module}--${currentFileName}`);
    }
}

// 监测一个文件
function checkOneFile(vueUrl, flag) {
    let _configContent = fs.readFileSync(vueUrl, 'utf-8')
    let lines = _configContent.split('\n');
    for (var i = 0; i < lines.length; i++) {
        if (flag) {
            checkVueOneline(lines[i]);
        } else {
            checkRouterOneline(lines[i]);
        }
    }
}
// 遍历一功能所有源代码内目录，找到vue文件并进行验证
function checkSrcDir(moduleSrcPath){
    let items = fs.readdirSync(moduleSrcPath);
    // 排除隐藏文件
    items = items.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item)); 
    // 遍历当前目录中所有的文件和文件夹
    items.map(item => {
        let temp = path.join(moduleSrcPath, item);
        // 若当前的为文件夹
        if (fs.statSync(temp).isDirectory()){
            // 进入下一级文件夹访问
            checkSrcDir( temp )
        }
        if (fs.statSync(temp).isFile()) {
            currentFileName = '';
            if (path.extname(temp).toLowerCase() === '.vue') {
                currentFileName = path.basename(temp);
                checkOneFile(temp, true);
            }
        }
    });
}
function checkRouter(moduleRouterPath){
    currentFileName = '';
    currentFileName = path.basename(moduleRouterPath);
    if (fs.existsSync(moduleRouterPath)) {
        checkOneFile(moduleRouterPath, false);
    } else {
        console.log(moduleRouterPath + '文件不存在');
    }
}

// 打印控制台
function consolePanel() {
    let allModulesList = allModulesListAry.join('\n');
    let str = `
请选择要监测的功能：

****************************************

    ${allModulesList}

****************************************
    `;
    rl.question(str, (answer) => {
        checkResult = [];
        let key = allModulesKeyWord[Number.parseInt(answer)-1];
        if (key) {
            readmeInfo.getCurrentModuleName(`../${key}/src/index.js`);
            checkSrcDir(`../${key}/src`);
            checkRouter(`../${key}/src/router.js`);
            if (checkResult.length > 0) {
              console.log('共有检测'+checkResult.length+'条记录，结果如下：');
              console.log('------------------------------------------');
              console.log(checkResult.join('\n'));
            } else {
                console.log('没有检测记录，其内部没有使用其他业务模块的组件');  
            }
            if(readmeInfo.checkCollectInfo()) {
                let question = `\n❓是否要打印依赖限制信息❓\n Y. 是  N. 否 \n`;
                rl.question(question, (answer) => {
                    if (answer.toLocaleLowerCase() === 'y') {
                        readmeInfo.writeInfo();
                    }
                    rl.close();
                });
            } else {
                rl.close();
            }
            
        } else {
            console.log('❗️请检查输入是否正确❗️')
        }
    });
    
}

readAllModuleFile();
if (!hasFileError) {
 consolePanel();
} else {
  console.log('❗️请先解决以上错误的文件使用问题❗️');  
}

// getOneModuleComponents(`../sicap-event-center-page/src/index.js`)
// checkOneFile('./AssetListOnePorject.vue', true);
// checkVueOneline();
// function test() {
//     var dataStr = "key: 'assetsMonitor',";
//     let regex = /^key.\s*'\w*'/g;
//     let moduleName = dataStr.match(regex);
//     console.log(moduleName[0].replace(/\'/g, '').split(':')[1].trim());
// }
// test();

