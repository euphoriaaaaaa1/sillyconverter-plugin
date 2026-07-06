// SillyTavern EPUB导出器插件
// 版本: 2.0.0
// 作者: SillyConverter Team

// 常量定义
const JSZIP_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
let isExporting = false;
let jszip_loaded = false;

// 动态加载 JSZip 库
function loadJSZip() {
    return new Promise((resolve, reject) => {
        // 如果已经加载且可用，直接返回
        if (window.JSZip && typeof window.JSZip === 'function') {
            jszip_loaded = true;
            console.log('[EPUB Exporter] JSZip already available.');
            resolve();
            return;
        }
        
        // 检查是否已经有加载中的脚本
        const existingScript = document.querySelector(`script[src="${JSZIP_CDN_URL}"]`);
        if (existingScript) {
            // 等待现有脚本加载完成
            existingScript.onload = () => {
                if (window.JSZip && typeof window.JSZip === 'function') {
                    jszip_loaded = true;
                    console.log('[EPUB Exporter] JSZip loaded from existing script.');
                    resolve();
                } else {
                    reject(new Error('JSZip library not available after loading'));
                }
            };
            existingScript.onerror = () => {
                reject(new Error('Failed to load JSZip library from CDN'));
            };
            return;
        }
        
        console.log('[EPUB Exporter] Loading JSZip from CDN...');
        const script = document.createElement('script');
        script.src = JSZIP_CDN_URL;
        script.onload = () => {
            // 等待一小段时间确保库完全初始化
            setTimeout(() => {
                if (window.JSZip && typeof window.JSZip === 'function') {
                    jszip_loaded = true;
                    console.log('[EPUB Exporter] JSZip loaded successfully.');
                    resolve();
                } else {
                    console.error('[EPUB Exporter] JSZip not available after loading');
                    reject(new Error('JSZip library not available after loading'));
                }
            }, 100);
        };
        script.onerror = () => {
            console.error('[EPUB Exporter] Failed to load JSZip from CDN.');
            reject(new Error('Failed to load JSZip library from CDN'));
        };
        document.head.appendChild(script);
    });
}

// 显示进度提示
function showProgress(message) {
    const progressText = document.querySelector('.epub-progress-text');
    if (progressText) {
        progressText.textContent = message;
    }
    console.log('[EPUB Exporter]', message);
}

// 显示错误消息
function showError(message) {
    console.error('[EPUB Exporter]', message);
    if (typeof toastr !== 'undefined') {
        toastr.error(`导出失败: ${message}`, 'EPUB 导出器');
    } else {
        alert(`导出失败: ${message}`);
    }
}

// 显示成功消息
function showSuccess(message) {
    console.log('[EPUB Exporter]', message);
    if (typeof toastr !== 'undefined') {
        toastr.success(message, 'EPUB 导出器');
    } else {
        alert(message);
    }
}

// 创建悬浮按钮和设置面板
function createFloatingButton() {
    // 检查是否已存在
    if (document.getElementById('epub-floating-button')) {
        return;
    }

    // 创建悬浮按钮
    const floatingButton = document.createElement('div');
    floatingButton.id = 'epub-floating-button';
    floatingButton.innerHTML = '📚';
    floatingButton.title = 'EPUB 导出器 - 拖拽移动位置';
    
    // 创建设置面板
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'epub-settings-panel';
    settingsPanel.innerHTML = `
        <div class="epub-panel-header">
            <h3>📚 EPUB 导出器</h3>
            <button class="epub-close-btn" onclick="document.getElementById('epub-settings-panel').style.display='none'">×</button>
        </div>
        <div class="epub-panel-content">
            <div class="epub-section">
                <h4>消息类型选择</h4>
                <div class="epub-option">
                    <label>
                        <input type="checkbox" id="epub-include-user" checked>
                        <span class="epub-checkbox-label">用户消息</span>
                    </label>
                </div>
                <div class="epub-option">
                    <label>
                        <input type="checkbox" id="epub-include-assistant" checked>
                        <span class="epub-checkbox-label">助手消息</span>
                    </label>
                </div>
                <div class="epub-option">
                    <label>
                        <input type="checkbox" id="epub-include-system">
                        <span class="epub-checkbox-label">系统消息</span>
                    </label>
                </div>
            </div>
            <div class="epub-section">
                <h4>其他选项</h4>
                <div class="epub-option">
                    <label>
                        <input type="checkbox" id="epub-include-timestamps" checked>
                        <span class="epub-checkbox-label">包含时间戳</span>
                    </label>
                </div>
            </div>
            <div class="epub-progress-container" style="display: none;">
                <div class="epub-progress-bar">
                    <div class="epub-progress-fill"></div>
                </div>
                <div class="epub-progress-text">准备导出...</div>
            </div>
            <button id="epub-export-button" class="epub-export-btn">
                📚 导出为 EPUB
            </button>
        </div>
    `;

    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        #epub-floating-button {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 56px !important;
            height: 56px !important;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 20px !important;
            cursor: move !important;
            box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4) !important;
            z-index: 999999 !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #epub-floating-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(79, 70, 229, 0.5);
            background: linear-gradient(135deg, #5b52f0 0%, #8b5cf6 100%);
        }
        
        #epub-floating-button.dragging {
            transform: scale(1.1);
            box-shadow: 0 8px 30px rgba(79, 70, 229, 0.6);
            z-index: 10001;
        }
        
        #epub-settings-panel {
            position: fixed !important;
            bottom: 90px !important;
            right: 20px !important;
            width: 320px !important;
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            z-index: 999998 !important;
            display: none !important;
            animation: slideUp 0.3s ease !important;
            backdrop-filter: blur(10px) !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .epub-panel-header {
            padding: 20px 20px 15px 20px;
            border-bottom: 1px solid #f3f4f6;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .epub-panel-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 18px;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .epub-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        
        .epub-close-btn:hover {
            background: #f3f4f6;
            color: #374151;
        }
        
        .epub-panel-content {
            padding: 20px;
        }
        
        .epub-section {
            margin-bottom: 20px;
        }
        
        .epub-section:last-of-type {
            margin-bottom: 15px;
        }
        
        .epub-section h4 {
            margin: 0 0 12px 0;
            color: #374151;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .epub-option {
            margin-bottom: 12px;
        }
        
        .epub-option:last-child {
            margin-bottom: 0;
        }
        
        .epub-option label {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .epub-option label:hover {
            background: #f9fafb;
        }
        
        .epub-checkbox-label {
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            margin-left: 8px;
        }
        
        .epub-option input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #4f46e5;
            cursor: pointer;
        }
        
        .epub-progress-container {
            margin: 20px 0;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        
        .epub-progress-bar {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .epub-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4f46e5, #7c3aed);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 3px;
        }
        
        .epub-progress-text {
            font-size: 13px;
            color: #64748b;
            text-align: center;
            font-weight: 500;
        }
        
        .epub-export-btn {
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.3);
        }
        
        .epub-export-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px 0 rgba(79, 70, 229, 0.4);
            background: linear-gradient(135deg, #5b52f0 0%, #8b5cf6 100%);
        }
        
        .epub-export-btn:active {
            transform: translateY(0);
        }
        
        .epub-export-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.2);
        }
        
        /* 暗色主题适配 */
        @media (prefers-color-scheme: dark) {
            #epub-settings-panel {
                background: #1f2937;
                border-color: #374151;
            }
            
            .epub-panel-header {
                background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
                border-color: #4b5563;
            }
            
            .epub-panel-header h3 {
                color: #f9fafb;
            }
            
            .epub-close-btn {
                color: #9ca3af;
            }
            
            .epub-close-btn:hover {
                background: #4b5563;
                color: #f3f4f6;
            }
            
            .epub-section h4 {
                color: #d1d5db;
            }
            
            .epub-checkbox-label {
                color: #e5e7eb;
            }
            
            .epub-option label:hover {
                background: #374151;
            }
            
            .epub-progress-container {
                background: #374151;
                border-color: #4b5563;
            }
            
            .epub-progress-bar {
                background: #4b5563;
            }
            
            .epub-progress-text {
                color: #9ca3af;
            }
        }
        
        /* 响应式设计 */
        @media (max-width: 480px) {
            #epub-settings-panel {
                width: calc(100vw - 40px);
                right: 20px;
                left: 20px;
            }
        }
    `;

    // 添加到页面
    document.head.appendChild(style);
    document.body.appendChild(floatingButton);
    document.body.appendChild(settingsPanel);

    // 添加拖拽功能
    makeDraggable(floatingButton);

    // 绑定事件
    floatingButton.addEventListener('click', (e) => {
        // 如果是拖拽结束后的点击，不触发面板切换
        if (floatingButton.dataset.justDragged === 'true') {
            floatingButton.dataset.justDragged = 'false';
            return;
        }
        toggleSettingsPanel();
    });
    
    document.getElementById('epub-export-button').addEventListener('click', onExportClick);
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !floatingButton.contains(e.target)) {
            settingsPanel.style.display = 'none';
        }
    });

    console.log('[EPUB Exporter] 可拖拽悬浮按钮已创建');
}

// 拖拽功能实现
function makeDraggable(element) {
    let isDragging = false;
    let hasMoved = false; // 是否真的拖动过（超过阈值），用来区分“点击”和“拖拽”
    const DRAG_THRESHOLD = 5; // 像素，移动小于此值视为点击
    let startX, startY, initialX, initialY;

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        isDragging = true;
        hasMoved = false;

        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        
        startX = clientX;
        startY = clientY;
        
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);
        
        e.preventDefault();
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // 只有移动超过阈值才算真正拖拽，避免普通点击被误判
        if (!hasMoved && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
            hasMoved = true;
            element.classList.add('dragging');
        }

        let newX = initialX + deltaX;
        let newY = initialY + deltaY;
        
        // 边界检测
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        
        e.preventDefault();
    }
    
    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            element.classList.remove('dragging');
            // 只有真的拖动过才标记 justDragged，否则普通点击会被 click 处理器吞掉、面板打不开
            if (hasMoved) {
                element.dataset.justDragged = 'true';
                setTimeout(() => {
                    element.dataset.justDragged = 'false';
                }, 100);
            }
        }
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
    }
}

// 切换设置面板显示
function toggleSettingsPanel() {
    const panel = document.getElementById('epub-settings-panel');
    if (!panel) return;
    // 用 computed style 判断当前真实可见性（初始的 display:none 来自样式表，不在 inline 上），
    // 并用 setProperty(..., 'important') 覆盖样式表里的 `display: none !important`，否则面板显示不出来。
    const isHidden = getComputedStyle(panel).display === 'none';
    panel.style.setProperty('display', isHidden ? 'block' : 'none', 'important');
}

// 更新进度
function updateProgress(percent, message) {
    const progressFill = document.querySelector('.epub-progress-fill');
    const progressText = document.querySelector('.epub-progress-text');
    const progressContainer = document.querySelector('.epub-progress-container');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
}

// 导出按钮点击事件
async function onExportClick() {
    if (isExporting) {
        showError('导出正在进行中，请稍候...');
        return;
    }

    const exportButton = document.getElementById('epub-export-button');
    
    try {
        isExporting = true;
        exportButton.disabled = true;
        exportButton.textContent = '导出中...';
        
        updateProgress(10, '正在初始化...');
        
        // 获取用户选择的消息类型（ID 必须与面板里定义的一致）
        const includeUser = document.getElementById('epub-include-user').checked;
        const includeAssistant = document.getElementById('epub-include-assistant').checked;
        const includeSystem = document.getElementById('epub-include-system').checked;
        
        // 加载依赖
        updateProgress(20, '正在加载依赖库...');
        try {
            await loadJSZip();
        } catch (error) {
            throw new Error(`无法加载JSZip库: ${error.message}`);
        }
        
        // 再次确认JSZip可用
        if (!window.JSZip || typeof window.JSZip !== 'function') {
            throw new Error('JSZip库加载后仍不可用，请检查网络连接');
        }
        
        updateProgress(40, '正在创建EPUB文件...');
        
        // 创建EPUB，传递消息类型选择
        const epubBlob = await createEpub(includeUser, includeAssistant, includeSystem);
        
        updateProgress(90, '正在准备下载...');
        
        // 下载文件
        const characterName = getCharacterName();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${characterName}_chat_${timestamp}.epub`;
        
        const url = URL.createObjectURL(epubBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        updateProgress(100, '导出完成！');
        showSuccess(`EPUB文件已成功导出: ${filename}`);
        
        // 隐藏进度条
        setTimeout(() => {
            const progressContainer = document.querySelector('.epub-progress-container');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }, 2000);
        
    } catch (error) {
        console.error('[EPUB Exporter] 导出失败:', error);
        showError(error.message || '导出过程中发生未知错误');
        
        // 隐藏进度条
        const progressContainer = document.querySelector('.epub-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    } finally {
        isExporting = false;
        exportButton.disabled = false;
        exportButton.textContent = '📚 导出为 EPUB';
    }
}

// 获取角色名称
function getCharacterName() {
    try {
        // 尝试多种方式获取角色名称
        const characterName = 
            window.this_chid !== undefined && window.characters && window.characters[window.this_chid] 
                ? window.characters[window.this_chid].name 
                : document.querySelector('.character_name')?.textContent?.trim() ||
                  document.querySelector('#character_name')?.textContent?.trim() ||
                  document.querySelector('[data-character-name]')?.getAttribute('data-character-name') ||
                  'Unknown';
        
        return characterName.replace(/[<>:"/\\|?*]/g, '_');
    } catch (error) {
        console.warn('[EPUB Exporter] 无法获取角色名称:', error);
        return 'Chat';
    }
}

// 创建EPUB文件
async function createEpub(includeUser = true, includeAssistant = true, includeSystem = false) {
    // 确保JSZip可用
    if (!window.JSZip || typeof window.JSZip !== 'function') {
        throw new Error('JSZip library is not available');
    }
    
    const zip = new window.JSZip();
    
    updateProgress(45, '正在收集聊天消息...');
    
    // 获取用户选项
    const includeTimestamps = document.getElementById('epub-include-timestamps')?.checked ?? true;
    
    // 获取聊天消息，传递消息类型选择
    const messages = getChatMessages(includeUser, includeAssistant, includeSystem);
    if (messages.length === 0) {
        throw new Error('没有找到聊天消息');
    }
    
    updateProgress(50, '正在处理消息内容...');
    
    // 处理消息和图片
    const { processedMessages, imageMap } = await processMessages(messages, zip);
    
    updateProgress(70, '正在生成EPUB结构...');
    
    // 创建EPUB文件结构
    await createEpubStructure(zip, processedMessages, imageMap, includeTimestamps);
    
    updateProgress(85, '正在打包文件...');
    
    // 生成EPUB文件
    const epubBlob = await zip.generateAsync({ type: 'blob' });
    
    return epubBlob;
}

// 获取聊天消息
function getChatMessages(includeUser = true, includeAssistant = true, includeSystem = false) {
    const messages = [];

    // 【所见即所得】优先从页面上可见的消息 DOM 读取：正则切除、markdown 渲染之后的结果，
    // 正是你眼睛看到的文字和图片（图片就内联在其中，位置天然正确）。拿不到再退回 window.chat 原文。
    const visibleChat = document.getElementById('chat');
    if (visibleChat) {
        visibleChat.querySelectorAll('.mes').forEach(el => {
            const isUser = el.getAttribute('is_user') === 'true';
            const isSystem = el.getAttribute('is_system') === 'true';
            if (isSystem && !includeSystem) return;
            if (isUser && !includeUser) return;
            if (!isUser && !isSystem && !includeAssistant) return;

            const textEl = el.querySelector('.mes_text');
            const visibleHtml = textEl ? textEl.innerHTML.trim() : '';
            if (!visibleHtml) return; // 跳过空消息

            messages.push({
                name: el.querySelector('.name_text')?.textContent?.trim() || (isUser ? 'You' : 'Assistant'),
                mes: visibleHtml, // 渲染后的可见 HTML，含内联图片
                is_user: isUser,
                is_system: isSystem,
                send_date: el.querySelector('.timestamp')?.textContent?.trim() || '',
                extra: {}
            });
        });

        if (messages.length > 0) {
            console.log(`[EPUB Exporter] 从可见 DOM 获取到 ${messages.length} 条消息（所见即所得）`);
            return messages;
        }
        console.warn('[EPUB Exporter] 可见 DOM 未取到消息，回退到 window.chat 原文');
    }

    try {
        // 备用：从SillyTavern的全局变量获取（原文，非所见即所得）
        if (window.chat && Array.isArray(window.chat) && window.chat.length > 0) {
            console.log(`[EPUB Exporter] 从全局变量获取到 ${window.chat.length} 条消息`);
            return window.chat.filter(msg => {
                // 根据消息类型过滤
                if (msg.is_system && !includeSystem) return false;
                if (msg.is_user && !includeUser) return false;
                if (!msg.is_user && !msg.is_system && !includeAssistant) return false;
                
                return msg.mes && msg.mes.trim().length > 0;
            });
        }
        
        // 备用方案1：尝试从其他全局变量获取
        if (window.context && window.context.chat && Array.isArray(window.context.chat)) {
            console.log(`[EPUB Exporter] 从context.chat获取到 ${window.context.chat.length} 条消息`);
            return window.context.chat.filter(msg => {
                // 根据消息类型过滤
                if (msg.is_system && !includeSystem) return false;
                if (msg.is_user && !includeUser) return false;
                if (!msg.is_user && !msg.is_system && !includeAssistant) return false;
                
                return msg.mes && msg.mes.trim().length > 0;
            });
        }
        
        // 备用方案2：从DOM获取，使用更精确的选择器
        console.log('[EPUB Exporter] 尝试从DOM获取消息');
        
        // 尝试多种消息容器选择器
        const containerSelectors = [
            '#chat',
            '#sheld',
            '.chat-container',
            '.messages-container',
            '.conversation',
            '.chat-history'
        ];
        
        let chatContainer = null;
        for (const selector of containerSelectors) {
            chatContainer = document.querySelector(selector);
            if (chatContainer) {
                console.log(`[EPUB Exporter] 找到聊天容器: ${selector}`);
                break;
            }
        }
        
        if (!chatContainer) {
            console.warn('[EPUB Exporter] 未找到聊天容器');
            chatContainer = document.body; // 使用整个页面作为备选
        }
        
        // 在容器内查找消息元素
        const messageSelectors = [
            '.mes:not(.system):not(.hidden)',
            '.message:not(.system):not(.hidden)',
            '[data-message]:not(.system):not(.hidden)',
            '.chat-message:not(.system):not(.hidden)',
            '.message-container:not(.system):not(.hidden)',
            'div[class*="mes"]:not(.system):not(.hidden)',
            'div[class*="message"]:not(.system):not(.hidden)'
        ];
        
        let messageElements = [];
        for (const selector of messageSelectors) {
            messageElements = chatContainer.querySelectorAll(selector);
            if (messageElements.length > 0) {
                console.log(`[EPUB Exporter] 使用选择器 "${selector}" 找到 ${messageElements.length} 个消息元素`);
                break;
            }
        }
        
        if (messageElements.length === 0) {
            console.warn('[EPUB Exporter] 未找到任何消息元素，尝试更宽泛的搜索');
            // 最后的备选方案：查找所有可能的消息元素
            messageElements = chatContainer.querySelectorAll('div, p, article, section');
            messageElements = Array.from(messageElements).filter(el => {
                const text = el.textContent?.trim();
                return text && text.length > 10 && // 至少10个字符
                       !el.querySelector('script, style') && // 不包含脚本或样式
                       !el.classList.contains('hidden') && // 不是隐藏元素
                       !el.classList.contains('system'); // 不是系统消息
            });
            console.log(`[EPUB Exporter] 备选方案找到 ${messageElements.length} 个可能的消息元素`);
        }
        
        if (messageElements.length === 0) {
            console.error('[EPUB Exporter] 完全未找到任何消息元素');
            return [];
        }
        
        messageElements.forEach((element, index) => {
            try {
                // 尝试多种内容选择器
                const contentSelectors = [
                    '.mes_text',
                    '.message-text', 
                    '.content', 
                    '.message-content', 
                    '.text',
                    '.body',
                    '.message-body'
                ];
                
                let contentElement = null;
                for (const selector of contentSelectors) {
                    contentElement = element.querySelector(selector);
                    if (contentElement) break;
                }
                
                // 如果没有找到内容元素，直接使用当前元素
                if (!contentElement) {
                    contentElement = element;
                }
                
                // 判断消息类型
                const isUser = element.classList.contains('ch_name') || 
                              element.querySelector('.ch_name') ||
                              element.classList.contains('user-message') ||
                              element.classList.contains('user') ||
                              element.hasAttribute('data-is-user') ||
                              element.hasAttribute('data-user');
                
                const isSystem = element.classList.contains('system') ||
                               element.classList.contains('system-message') ||
                               element.classList.contains('is_system') ||
                               element.hasAttribute('data-is-system') ||
                               element.hasAttribute('data-system');
                
                // 根据消息类型过滤
                if (isSystem && !includeSystem) return;
                if (isUser && !includeUser) return;
                if (!isUser && !isSystem && !includeAssistant) return;
                
                // 尝试多种方式获取角色名称
                const nameSelectors = [
                    '.name_text', 
                    '.character-name', 
                    '.sender', 
                    '.mes_name', 
                    '.name',
                    '.author',
                    '.username',
                    '.speaker'
                ];
                
                let characterName = '';
                for (const selector of nameSelectors) {
                    const nameElement = element.querySelector(selector);
                    if (nameElement && nameElement.textContent.trim()) {
                        characterName = nameElement.textContent.trim();
                        break;
                    }
                }
                
                if (!characterName) {
                    characterName = isUser ? 'You' : 'Assistant';
                }
                
                // 获取时间戳
                const timestampSelectors = [
                    '.timestamp', 
                    '.time', 
                    '.mes_date',
                    '.date',
                    '.created-at',
                    '.sent-at'
                ];
                
                let timestamp = '';
                for (const selector of timestampSelectors) {
                    const timeElement = element.querySelector(selector);
                    if (timeElement && timeElement.textContent.trim()) {
                        timestamp = timeElement.textContent.trim();
                        break;
                    }
                }
                
                if (!timestamp) {
                    timestamp = new Date().toLocaleString();
                }
                
                const messageText = extractTextContent(contentElement);
                
                if (messageText && messageText.trim()) {
                    messages.push({
                        name: characterName,
                        mes: messageText,
                        is_user: isUser,
                        is_system: isSystem,
                        send_date: timestamp,
                        extra: {}
                    });
                }
            } catch (error) {
                console.warn(`[EPUB Exporter] 处理消息元素 ${index} 时出错:`, error);
            }
        });
        
        console.log(`[EPUB Exporter] 从DOM获取到 ${messages.length} 条有效消息`);
        
    } catch (error) {
        console.error('[EPUB Exporter] 获取消息时出错:', error);
    }
    
    return messages;
}

// 提取文本内容并过滤不需要的元素
function extractTextContent(element) {
    const clone = element.cloneNode(true);
    
    // 移除不需要的元素（包括UI相关元素）
    const unwantedSelectors = [
        'script', 'style', 'noscript', '.timestamp', '.message-id',
        '.edit-controls', '.swipe-controls', '.mes_edit_buttons', '.avatar',
        '.mes_buttons', '.mes_edit_cancel', '.mes_edit_save', '.mes_edit_delete',
        'StatusBlock', 'details', '.mes_block', '.mes_img_container',
        '.mes_img', '.avatar_load', '.mes_hide', '.mes_unhide',
        '.mes_narrow', '.mes_wide', '.last_mes', '.mes_selected',
        '.mes_text_avatar', '.mes_text_name', '.mes_text_controls',
        '.mes_text_buttons', '.mes_text_timestamp', '.mes_text_id',
        '.mes_text_edit', '.mes_text_delete', '.mes_text_copy',
        '.mes_text_regenerate', '.mes_text_continue', '.mes_text_impersonate',
        '.mes_text_bookmark', '.mes_text_favorite', '.mes_text_pin',
        '.mes_text_unpin', '.mes_text_translate', '.mes_text_tts',
        '.mes_text_stop', '.mes_text_pause', '.mes_text_resume',
        '.mes_text_speed', '.mes_text_voice', '.mes_text_volume',
        '.mes_text_pitch', '.mes_text_rate', '.mes_text_lang',
        '.mes_text_ssml', '.mes_text_emotion', '.mes_text_style',
        '.mes_text_effect', '.mes_text_filter', '.mes_text_reverb',
        '.mes_text_echo', '.mes_text_chorus', '.mes_text_flanger',
        '.mes_text_phaser', '.mes_text_distortion', '.mes_text_compressor',
        '.mes_text_limiter', '.mes_text_gate', '.mes_text_expander',
        '.mes_text_eq', '.mes_text_analyzer', '.mes_text_spectrum',
        '.mes_text_oscilloscope', '.mes_text_waveform', '.mes_text_meter',
        '.mes_text_monitor', '.mes_text_recorder', '.mes_text_player',
        '.mes_text_editor', '.mes_text_mixer', '.mes_text_synthesizer'
        // 注意：不要在这里加 .container/.box/.card/.item/.wrapper 等超通用类名，
        // 消息正文里的自定义 HTML（角色卡、状态框）常用这些类，会被误删。
    ];
    
    unwantedSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // 移除所有style属性和class属性（避免样式污染）
    clone.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
        el.removeAttribute('class');
        el.removeAttribute('id');
    });

    // 移除YAML代码块和StatusBlock内容
    let html = clone.innerHTML;
    html = html
        .replace(/```yaml[\s\S]*?```/gi, '') // 移除yaml代码块
        .replace(/<StatusBlock\s*[^>]*>[\s\S]*?(?:<\/StatusBlock>|$)/gi, '') // 移除StatusBlock
        .replace(/<StatusBlock>\s*```yaml[\s\S]*?```[\s\S]*?<\/StatusBlock>/gi, '')
        .replace(/<StatusBlock>[\s\S]*?<\/StatusBlock>/gi, '')
        .replace(/```yaml[\s\S]*?```/gi, '');

    // 简化HTML处理，避免复杂的标签操作
    // 直接处理HTML字符串，确保标签正确
    html = html
        // 修复br标签 - 确保自闭合
        .replace(/<br\s*\/?>/gi, '<br/>')
        .replace(/<br\s+([^>]*?)\s*\/?>/gi, '<br/>')
        // 修复hr标签 - 确保自闭合
        .replace(/<hr\s*\/?>/gi, '<hr/>')
        .replace(/<hr\s+([^>]*?)\s*\/?>/gi, '<hr/>')
        // 修复img标签 - 确保自闭合并保留重要属性
        .replace(/<img\s+([^>]*?)\s*\/?>/gi, (match, attrs) => {
            // 只保留src和alt属性
            const srcMatch = attrs.match(/src\s*=\s*["']([^"']*?)["']/i);
            const altMatch = attrs.match(/alt\s*=\s*["']([^"']*?)["']/i);
            let result = '<img';
            if (srcMatch) result += ` src="${srcMatch[1]}"`;
            if (altMatch) result += ` alt="${altMatch[1]}"`;
            result += '/>';
            return result;
        })
        // 移除空的p标签
        .replace(/<p\s*[^>]*>\s*<\/p>/gi, '')
        // 确保p标签正确闭合 - 简化处理
        .replace(/<p\s*[^>]*>([^<]*?)(?=<(?:\/p|p|div|h[1-6]|br|hr|img|$))/gi, '<p>$1</p>')
        // 修复未闭合的p标签
        .replace(/<p\s*[^>]*>([^<]*?)$/gi, '<p>$1</p>')
        // 移除嵌套的p标签
        .replace(/<p[^>]*><p[^>]*>/gi, '<p>')
        .replace(/<\/p><\/p>/gi, '</p>')
        // 移除多余的闭合标签
        .replace(/<\/p>\s*<\/p>/gi, '</p>')
        .replace(/<p>\s*<\/p>/gi, '');
    
    // 只把 &nbsp; 转成普通空格。其余 HTML 实体（&lt; &gt; &amp; 等）保持转义，
    // 否则会把用户打的字面文本还原成真标签、并生成非法 XML，导致 EPUB 阅读器解析失败。
    html = html.replace(/&nbsp;/g, ' ');
    
    // 清理多余的换行和空白
    html = html
        .replace(/\s*\n\s*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
    
    // 最终验证和清理
    try {
        // 创建临时div验证HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 获取纯净的HTML
        const cleanHtml = tempDiv.innerHTML;
        
        // 如果HTML为空或只有空白，返回纯文本
        if (!cleanHtml.trim()) {
            return tempDiv.textContent || tempDiv.innerText || '';
        }
        
        return cleanHtml;
    } catch (error) {
        console.warn('[EPUB Exporter] HTML处理失败，返回纯文本', error);
        // 如果处理失败，返回纯文本内容
        const textDiv = document.createElement('div');
        textDiv.innerHTML = html;
        return textDiv.textContent || textDiv.innerText || '';
    }
}

// 处理消息和图片
async function processMessages(messages, zip) {
    const processedMessages = [];
    const imageMap = new Map();
    let imageCounter = 1;
    
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        updateProgress(50 + (i / messages.length) * 15, `正在处理消息 ${i + 1}/${messages.length}...`);
        
        let processedContent = message.mes;
        
        // 处理图片
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let match;
        
        while ((match = imgRegex.exec(message.mes)) !== null) {
            const imgSrc = match[1];
            const fullImgTag = match[0];
            
            try {
                // 跳过已处理的图片
                if (imageMap.has(imgSrc)) {
                    const existingImageName = imageMap.get(imgSrc);
                    if (existingImageName) {
                        processedContent = processedContent.replace(fullImgTag, 
                            `<img src="images/${existingImageName}" alt="Chat Image" style="max-width: 100%; height: auto; margin: 10px 0;" />`
                        );
                    }
                    continue;
                }
                
                // 处理不同类型的图片路径
                let imageUrl = imgSrc;
                
                // 如果是相对路径，转换为绝对路径
                if (imgSrc.startsWith('./') || imgSrc.startsWith('../') || (!imgSrc.startsWith('http') && !imgSrc.startsWith('data:') && !imgSrc.startsWith('/'))) {
                    // 相对于当前页面的路径
                    imageUrl = new URL(imgSrc, window.location.href).href;
                } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('//')) {
                    // 相对于域名根目录的路径
                    imageUrl = new URL(imgSrc, window.location.origin).href;
                }
                
                console.log(`[EPUB Exporter] 处理图片: ${imgSrc} -> ${imageUrl}`);
                
                const imageBlob = await getImageBlob(imageUrl);
                
                if (imageBlob && imageBlob.size > 0) {
                    const imageExtension = getImageExtension(imageUrl);
                    const imageName = `image_${imageCounter}.${imageExtension}`;
                    
                    zip.file(`OEBPS/images/${imageName}`, imageBlob);
                    imageMap.set(imgSrc, imageName);
                    
                    processedContent = processedContent.replace(fullImgTag, 
                        `<img src="images/${imageName}" alt="Chat Image ${imageCounter}" style="max-width: 100%; height: auto; margin: 10px 0;" />`
                    );
                    
                    imageCounter++;
                    console.log(`[EPUB Exporter] 成功处理图片: ${imageName}, 大小: ${imageBlob.size} bytes`);
                } else {
                    console.warn('[EPUB Exporter] 图片Blob为空或无效:', imgSrc);
                    imageMap.set(imgSrc, null);
                    // 提取alt属性作为占位符
                    const altMatch = fullImgTag.match(/alt=["']([^"']*)["']/i);
                    const altText = altMatch ? altMatch[1] : '图片';
                    processedContent = processedContent.replace(fullImgTag, 
                        `<p><em>[${altText}无法显示]</em></p>`
                    );
                }
            } catch (error) {
                console.warn('[EPUB Exporter] 处理图片失败:', imgSrc, error);
                imageMap.set(imgSrc, null);
                // 提取alt属性作为占位符
                const altMatch = fullImgTag.match(/alt=["']([^"']*)["']/i);
                const altText = altMatch ? altMatch[1] : '图片';
                processedContent = processedContent.replace(fullImgTag, 
                    `<p><em>[${altText}处理失败: ${error.message || '未知错误'}]</em></p>`
                );
            }
        }
        
        processedMessages.push({
            ...message,
            processedContent: htmlToXhtml(processedContent) // 规整成合法 XHTML
        });
    }
    
    return { processedMessages, imageMap };
}

// 获取图片Blob
async function getImageBlob(src) {
    try {
        if (src.startsWith('data:')) {
            // Base64图片 - 改进处理方式
            try {
                const base64Data = src.split(',')[1];
                const mimeType = src.split(';')[0].split(':')[1];
                
                // 验证base64数据
                if (!base64Data) {
                    throw new Error('无效的base64数据');
                }
                
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                return new Blob([bytes], { type: mimeType });
            } catch (base64Error) {
                console.warn('Base64解码失败，尝试fetch方式:', base64Error);
                const response = await fetch(src);
                return await response.blob();
            }
        } else {
            // URL图片 - 改进处理方式
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加到15秒超时
            
            try {
                // 尝试多种请求方式
                let response;
                
                // 首先尝试标准请求
                try {
                    response = await fetch(src, { 
                        mode: 'cors',
                        signal: controller.signal,
                        headers: {
                            'Accept': 'image/*,*/*',
                            'User-Agent': 'Mozilla/5.0 (compatible; EPUB-Exporter)'
                        }
                    });
                } catch (corsError) {
                    console.warn('CORS请求失败，尝试no-cors模式:', corsError);
                    // 如果CORS失败，尝试no-cors模式
                    response = await fetch(src, { 
                        mode: 'no-cors',
                        signal: controller.signal
                    });
                }
                
                clearTimeout(timeoutId);
                
                if (!response.ok && response.status !== 0) { // no-cors模式status为0
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const blob = await response.blob();
                
                // 验证blob大小
                if (blob.size === 0) {
                    throw new Error('获取到空的图片数据');
                }
                
                // 如果blob类型未知，尝试从URL推断
                if (!blob.type || blob.type === 'application/octet-stream') {
                    const extension = getImageExtension(src);
                    const mimeType = getMimeTypeFromExtension(extension);
                    return new Blob([blob], { type: mimeType });
                }
                
                return blob;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        }
    } catch (error) {
        console.error(`获取图片失败 ${src}:`, error);
        throw error;
    }
}

// 根据扩展名获取MIME类型
function getMimeTypeFromExtension(extension) {
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon'
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

// 获取图片扩展名
function getImageExtension(src) {
    if (src.startsWith('data:image/')) {
        const mimeType = src.split(';')[0].split(':')[1];
        return mimeType.split('/')[1] || 'jpg';
    }
    
    const extension = src.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension) ? extension : 'jpg';
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 把浏览器渲染出的 HTML 规整成合法 XHTML（EPUB 正文必须是 well-formed XML，否则严格阅读器解析失败）
function htmlToXhtml(html) {
    try {
        const doc = new DOMParser().parseFromString(`<div id="__epub_root">${html}</div>`, 'text/html');
        const root = doc.getElementById('__epub_root');
        // 不该进电子书的元素直接去掉
        root.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        const xml = new XMLSerializer().serializeToString(root);
        // 去掉 XMLSerializer 给根 div 加的外壳和 xmlns
        return xml.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    } catch (e) {
        console.warn('[EPUB Exporter] XHTML 规整失败，退回纯文本', e);
        const d = document.createElement('div');
        d.textContent = html;
        return d.innerHTML;
    }
}

// 创建EPUB结构
async function createEpubStructure(zip, messages, imageMap, includeTimestamps) {
    // mimetype文件
    zip.file('mimetype', 'application/epub+zip');
    
    // META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`);
    
    // 生成HTML内容
    const characterName = getCharacterName();
    const htmlContent = generateHtmlContent(messages, characterName, includeTimestamps);
    
    zip.file('OEBPS/chapter1.xhtml', htmlContent);
    
    // CSS样式
    const cssContent = `
        body {
            font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #fafafa;
            color: #333;
        }
        
        .chat-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .chat-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        
        .chat-content {
            padding: 0;
        }
        
        .message {
            padding: 20px 30px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            flex-direction: column;
        }
        
        .message:last-child {
            border-bottom: none;
        }
        
        .message.user {
            background-color: #f8f9ff;
        }
        
        .message.assistant {
            background-color: #ffffff;
        }
        
        .message.system {
            background-color: #fff9e6;
            font-style: italic;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .sender-name {
            font-weight: 600;
            color: #667eea;
            font-size: 16px;
        }
        
        .message.user .sender-name {
            color: #28a745;
        }
        
        .message.system .sender-name {
            color: #ffc107;
        }
        
        .timestamp {
            font-size: 12px;
            color: #888;
            opacity: 0.8;
        }
        
        .message-content {
            font-size: 15px;
            line-height: 1.7;
            word-wrap: break-word;
        }
        
        .message-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 10px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .message-content p {
            margin: 0 0 10px 0;
        }
        
        .message-content p:last-child {
            margin-bottom: 0;
        }
        
        .export-info {
            text-align: center;
            padding: 20px;
            color: #888;
            font-size: 12px;
            border-top: 1px solid #f0f0f0;
            background-color: #fafafa;
        }
        
        @media print {
            body { background: white; }
            .chat-container { box-shadow: none; }
        }
    `;
    
    zip.file('OEBPS/style.css', cssContent);
    
    // content.opf
    const contentOpf = generateContentOpf(characterName, imageMap);
    zip.file('OEBPS/content.opf', contentOpf);
    
    // toc.ncx
    const tocNcx = generateTocNcx(characterName);
    zip.file('OEBPS/toc.ncx', tocNcx);
}

// 生成HTML内容
function generateHtmlContent(messages, characterName, includeTimestamps) {
    const messagesHtml = messages.map(message => {
        const senderClass = message.is_user ? 'user' : (message.is_system ? 'system' : 'assistant');
        const senderName = message.name || (message.is_user ? 'You' : characterName);
        const timestamp = includeTimestamps && message.send_date ? 
            `<span class="timestamp">${message.send_date}</span>` : '';
        
        return `
            <div class="message ${senderClass}">
                <div class="message-header">
                    <span class="sender-name">${escapeHtml(senderName)}</span>
                    ${timestamp}
                </div>
                <div class="message-content">${message.processedContent}</div>
            </div>
        `;
    }).join('');
    
    const exportTime = new Date().toLocaleString('zh-CN');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>与 ${escapeHtml(characterName)} 的聊天记录</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>📚 与 ${escapeHtml(characterName)} 的聊天记录</h1>
        </div>
        <div class="chat-content">
            ${messagesHtml}
        </div>
        <div class="export-info">
            导出时间: ${exportTime} | 由 SillyTavern EPUB 导出器生成
        </div>
    </div>
</body>
</html>`;
}

// 生成content.opf
function generateContentOpf(characterName, imageMap) {
    // imageMap 是 [图片原始URL -> image_N.png]，失败的图片值为 null。
    // manifest 只需要真实的文件名，据此生成合法的 id / href / media-type。
    const imageManifest = Array.from(imageMap.values())
        .filter(imageName => imageName) // 跳过下载失败的图片
        .map(imageName => {
            const ext = imageName.split('.').pop().toLowerCase();
            const mediaType = getMimeTypeFromExtension(ext); // 返回如 image/png
            const id = imageName.replace(/\./g, '_'); // image_1.png -> image_1_png
            return `<item id="${id}" href="images/${imageName}" media-type="${mediaType}"/>`;
        }).join('\n    ');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>与 ${escapeHtml(characterName)} 的聊天记录</dc:title>
        <dc:creator>SillyTavern EPUB 导出器</dc:creator>
        <dc:identifier id="bookid">sillytavern-chat-${Date.now()}</dc:identifier>
        <dc:language>zh-CN</dc:language>
        <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
        <dc:description>使用 SillyTavern EPUB 导出器生成的聊天记录</dc:description>
        <meta name="cover" content="cover"/>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
        <item id="css" href="style.css" media-type="text/css"/>
        ${imageManifest}
    </manifest>
    <spine toc="ncx">
        <itemref idref="chapter1"/>
    </spine>
</package>`;
}

// 生成toc.ncx
function generateTocNcx(characterName) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="sillytavern-chat-${Date.now()}"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle>
        <text>与 ${escapeHtml(characterName)} 的聊天记录</text>
    </docTitle>
    <navMap>
        <navPoint id="chapter1" playOrder="1">
            <navLabel>
                <text>聊天记录</text>
            </navLabel>
            <content src="chapter1.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`;
}

// 扩展初始化函数
function init() {
    console.log('[EPUB Exporter] Extension initialized');
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
        createFloatingButton();
    }
}

// 当页面加载完成时初始化扩展
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}