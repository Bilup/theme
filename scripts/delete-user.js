/**
 * 删除用户所有数据的脚本
 * 用法: node delete-user.js <userId> <authType>
 * 示例: node delete-user.js github:123456 github
 */

const fs = require('fs');
const path = require('path');

// 数据目录
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const THEMES_DIR = path.join(DATA_DIR, 'themes');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const RATINGS_DIR = path.join(DATA_DIR, 'ratings');
const DOWNLOADS_DIR = path.join(DATA_DIR, 'downloads');
const INDEX_FILE = path.join(THEMES_DIR, 'theme-index.json');

/**
 * 读取JSON文件
 */
function readJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

/**
 * 写入JSON文件
 */
function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * 删除文件
 */
function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 获取用户主题列表
 */
function getUserThemes(userId, authType) {
    const userFile = path.join(USERS_DIR, `${userId}.json`);
    const userData = readJson(userFile);
    
    if (!userData || !userData.themes) {
        return [];
    }
    
    return userData.themes;
}

/**
 * 删除主题文件
 */
function deleteThemeFile(uuid) {
    const themeFile = path.join(THEMES_DIR, `${uuid}.json`);
    return deleteFile(themeFile);
}

/**
 * 从索引中移除主题
 */
function removeFromIndex(uuid) {
    const index = readJson(INDEX_FILE);
    if (!index || !index.themes) {
        return false;
    }
    
    if (index.themes[uuid]) {
        delete index.themes[uuid];
        writeJson(INDEX_FILE, index);
        return true;
    }
    
    return false;
}

/**
 * 删除评分文件
 */
function deleteRatings(uuid) {
    const ratingsFile = path.join(RATINGS_DIR, `${uuid}.json`);
    return deleteFile(ratingsFile);
}

/**
 * 删除下载记录文件
 */
function deleteDownloads(uuid) {
    const downloadsFile = path.join(DOWNLOADS_DIR, `${uuid}.json`);
    return deleteFile(downloadsFile);
}

/**
 * 删除用户会话
 */
function deleteUserSessions(userId) {
    let deletedCount = 0;
    
    try {
        const sessionFiles = fs.readdirSync(SESSIONS_DIR);
        
        for (const file of sessionFiles) {
            if (!file.endsWith('.json')) continue;
            
            const sessionFile = path.join(SESSIONS_DIR, file);
            const sessionData = readJson(sessionFile);
            
            if (sessionData && sessionData.userId === userId) {
                if (deleteFile(sessionFile)) {
                    deletedCount++;
                }
            }
        }
    } catch (e) {
        console.error(`Error deleting sessions: ${e.message}`);
    }
    
    return deletedCount;
}

/**
 * 从其他用户的评分中移除该用户的评分
 */
function removeUserRatings(userId) {
    let cleanedCount = 0;
    
    try {
        const ratingFiles = fs.readdirSync(RATINGS_DIR);
        
        for (const file of ratingFiles) {
            if (!file.endsWith('.json')) continue;
            
            const ratingsFile = path.join(RATINGS_DIR, file);
            const ratingsData = readJson(ratingsFile);
            
            if (ratingsData && ratingsData.userRatings && ratingsData.userRatings[userId]) {
                const oldRating = ratingsData.userRatings[userId];
                
                // 更新计数
                if (oldRating === 'like') {
                    ratingsData.likes = (ratingsData.likes || 0) - 1;
                } else if (oldRating === 'dislike') {
                    ratingsData.dislikes = (ratingsData.dislikes || 0) - 1;
                }
                
                // 删除用户评分
                delete ratingsData.userRatings[userId];
                
                // 确保计数不为负
                if (ratingsData.likes < 0) ratingsData.likes = 0;
                if (ratingsData.dislikes < 0) ratingsData.dislikes = 0;
                
                writeJson(ratingsFile, ratingsData);
                cleanedCount++;
            }
        }
    } catch (e) {
        console.error(`Error cleaning user ratings: ${e.message}`);
    }
    
    return cleanedCount;
}

/**
 * 从下载记录中移除该用户
 */
function removeUserDownloads(userId) {
    let cleanedCount = 0;
    
    try {
        const downloadFiles = fs.readdirSync(DOWNLOADS_DIR);
        
        for (const file of downloadFiles) {
            if (!file.endsWith('.json')) continue;
            
            const downloadsFile = path.join(DOWNLOADS_DIR, file);
            const downloadsData = readJson(downloadsFile);
            
            if (downloadsData && downloadsData.downloads) {
                const index = downloadsData.downloads.indexOf(userId);
                if (index > -1) {
                    downloadsData.downloads.splice(index, 1);
                    writeJson(downloadsFile, downloadsData);
                    cleanedCount++;
                }
            }
        }
    } catch (e) {
        console.error(`Error cleaning user downloads: ${e.message}`);
    }
    
    return cleanedCount;
}

/**
 * 删除用户文件
 */
function deleteUserFile(userId) {
    const userFile = path.join(USERS_DIR, `${userId}.json`);
    return deleteFile(userFile);
}

/**
 * 主删除函数
 */
function deleteUser(userId, authType) {
    console.log(`\n========================================`);
    console.log(`开始删除用户: ${userId}`);
    console.log(`认证类型: ${authType}`);
    console.log(`========================================\n`);
    
    // 1. 获取用户的主题列表
    const userThemes = getUserThemes(userId, authType);
    console.log(`用户主题数量: ${userThemes.length}`);
    
    // 2. 删除用户的所有主题
    let deletedThemes = 0;
    for (const uuid of userThemes) {
        console.log(`删除主题: ${uuid}`);
        
        // 删除主题文件
        if (deleteThemeFile(uuid)) {
            console.log(`  ✓ 主题文件已删除`);
        } else {
            console.log(`  ✗ 主题文件删除失败或不存在`);
        }
        
        // 从索引中移除
        if (removeFromIndex(uuid)) {
            console.log(`  ✓ 已从索引中移除`);
        } else {
            console.log(`  ✗ 索引移除失败或不存在`);
        }
        
        // 删除评分文件
        if (deleteRatings(uuid)) {
            console.log(`  ✓ 评分文件已删除`);
        } else {
            console.log(`  ✗ 评分文件删除失败或不存在`);
        }
        
        // 删除下载记录
        if (deleteDownloads(uuid)) {
            console.log(`  ✓ 下载记录已删除`);
        } else {
            console.log(`  ✗ 下载记录删除失败或不存在`);
        }
        
        deletedThemes++;
    }
    
    // 3. 删除用户会话
    const deletedSessions = deleteUserSessions(userId);
    console.log(`\n删除会话数量: ${deletedSessions}`);
    
    // 4. 从其他用户的评分中移除该用户的评分
    const cleanedRatings = removeUserRatings(userId);
    console.log(`清理评分记录: ${cleanedRatings}`);
    
    // 5. 从下载记录中移除该用户
    const cleanedDownloads = removeUserDownloads(userId);
    console.log(`清理下载记录: ${cleanedDownloads}`);
    
    // 6. 删除用户文件
    if (deleteUserFile(userId)) {
        console.log(`✓ 用户文件已删除`);
    } else {
        console.log(`✗ 用户文件删除失败或不存在`);
    }
    
    console.log(`\n========================================`);
    console.log(`删除完成`);
    console.log(`删除主题数: ${deletedThemes}`);
    console.log(`删除会话数: ${deletedSessions}`);
    console.log(`清理评分记录: ${cleanedRatings}`);
    console.log(`清理下载记录: ${cleanedDownloads}`);
    console.log(`========================================\n`);
}

// 主程序
function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('用法: node delete-user.js <userId> <authType>');
        console.log('示例: node delete-user.js github:123456 github');
        console.log('示例: node delete-user.js @username scratch');
        process.exit(1);
    }
    
    const userId = args[0];
    const authType = args[1];
    
    // 确认删除
    console.log(`\n警告: 此操作将永久删除用户 ${userId} 的所有数据！`);
    console.log('包括: 用户信息、所有主题、会话、评分记录等\n');
    
    // 在实际环境中，这里应该添加确认提示
    // 为了安全起见，默认不执行删除，需要手动取消注释下面的代码
    
    // deleteUser(userId, authType);
    
    console.log('为了安全起见，请手动编辑脚本取消注释 deleteUser 调用。');
    console.log('或者使用以下命令:');
    console.log(`node -e "require('./delete-user').deleteUser('${userId}', '${authType}')"`);
}

// 导出函数供外部调用
module.exports = {
    deleteUser,
    getUserThemes,
    deleteThemeFile,
    removeFromIndex,
    deleteRatings,
    deleteDownloads,
    deleteUserSessions,
    removeUserRatings,
    removeUserDownloads,
    deleteUserFile
};

// 如果直接运行此脚本
if (require.main === module) {
    main();
}