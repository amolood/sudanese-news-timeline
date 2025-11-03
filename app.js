// انتظر حتى يتم تحميل محتوى الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('timeline-container');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const clearBtn = document.getElementById('clear-filters');
    const resultsCountEl = document.getElementById('results-count');
    const keywordCloudEl = document.getElementById('keyword-cloud');

    let allEvents = [];
    const selectedKeywords = new Set();

    // أدوات مساعدة
    const isValidDate = (d) => d instanceof Date && !isNaN(d);

    const stripJsonComments = (text) => {
        let t = text.replace(/^\uFEFF/, '');
        t = t.replace(/^\s*\/\/.*$/gm, '');
        t = t.replace(/\/\*[\s\S]*?\*\//g, '');
        return t.trim();
    };

    const getEventDate = (e) => new Date(e.date);

    // تطبيع العربية وإزالة التشكيل والتمطيط
    const normalizeArabic = (str = '') => {
        return str
            .toLowerCase()
            // إزالة التشكيل
            .replace(/[\u064B-\u0652\u0670]/g, '')
            // إزالة الكشيدة
            .replace(/\u0640/g, '')
            // توحيد الألف
            .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
            // همزات على واو/ياء
            .replace(/\u0624/g, '\u0648')
            .replace(/\u0626/g, '\u064a')
            // ى -> ي
            .replace(/\u0649/g, '\u064a')
            // أرقام إنجليزية/عربية إلى فراغ للفصل
            .replace(/[0-9\u0660-\u0669]/g, ' ')
            // حذف علامات الترقيم
            .replace(/[\u0600-\u0605\u061B\u061F\u066A-\u066D\u064B-\u0652\u0660-\u0669\u0610-\u061A\u06D6-\u06ED\p{P}\p{S}]/gu, ' ')
            // تحويل مسافات متعددة إلى فراغ واحد
            .replace(/\s+/g, ' ')
            .trim();
    };

    const AR_STOPWORDS = new Set([
        'من','في','على','عن','الى','إلى','حتى','ثم','ان','أن','إن','او','أو','و','كما','التي','الذي','اللذي','هذا','هذه','ذلك','تلك','مع','كان','كانت','يكون','تكون','قد','ما','لا','لم','لن','له','لها','لهم','لديهم','هناك','حيث','تم','خلال','بين','بعد','قبل','ضد','دون','بسبب','عبر','جميع','كل','اكثر','أكثر','بعض','اي','أي','اذا','إذا','لكن','بل','او','أو','الى','إلى','هو','هي','هم','هن','نحو','مثل','او','أو','اليوم','امس','أمس','غدا','غداً','وقد','وقد','وقد','حول','ضمن','حتى','عند','حتي','اما','أما','اذ','إذ','قال','أعلن','اكد','أكد','افاد','أفاد'
    ]);

    const tokenize = (text = '') => {
        const norm = normalizeArabic(text);
        if (!norm) return [];
        return norm
            .split(' ')
            .filter(w => w && w.length >= 3 && !AR_STOPWORDS.has(w));
    };

    const ensureEventTokens = (e) => {
        if (e._tokenSet) return e._tokenSet;
        const combined = `${e.title || ''} ${e.summary || ''}`;
        const tokens = tokenize(combined);
        e._tokenSet = new Set(tokens);
        return e._tokenSet;
    };

    // بناء تكرارات الكلمات عبر جميع الأحداث
    const buildKeywordFrequencies = (events) => {
        const freq = new Map();
        for (const e of events) {
            const combined = `${e.title || ''} ${e.summary || ''}`;
            const tokens = tokenize(combined);
            for (const t of tokens) {
                freq.set(t, (freq.get(t) || 0) + 1);
            }
        }
        return freq;
    };

    // تقديم السحابة
    const renderKeywordCloud = (freq) => {
        if (!keywordCloudEl) return;
        keywordCloudEl.innerHTML = '';

        // تصفية الكلمات قليلة التكرار واختيار حد مناسب
        const entries = Array.from(freq.entries())
            .filter(([, c]) => c >= 2);

        // إذا قليلة جدًا، لا نعرض شيئًا
        if (entries.length === 0) return;

        // ترتيب من الأكثر للأقل وأخذ حد أقصى
        entries.sort((a, b) => b[1] - a[1]);
        const limited = entries.slice(0, 60);

        const counts = limited.map(([, c]) => c);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const bucket = (c) => {
            if (max === min) return 3;
            const ratio = (c - min) / (max - min);
            return 1 + Math.round(ratio * 4); // 1..5
        };

        const frag = document.createDocumentFragment();
        for (const [word, count] of limited) {
            const span = document.createElement('span');
            span.className = `tag size-${bucket(count)}`;
            span.dataset.keyword = word;
            span.title = `تكرار: ${count}`;
            span.innerHTML = `${word} <span class="count">${count}</span>`;
            frag.appendChild(span);
        }
        keywordCloudEl.appendChild(frag);
    };

    const render = (events) => {
        timelineContainer.innerHTML = '';

        if (!events || events.length === 0) {
            timelineContainer.innerHTML = '<p style="text-align:center;color:#777">لا توجد نتائج مطابقة.</p>';
        } else {
            const frag = document.createDocumentFragment();
            events.forEach(event => {
                const linkHtml = event.link ? `<span class="sep">·</span><a href="${event.link}" target="_blank" rel="noopener noreferrer">رابط</a>` : '';
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                    <div class="timeline-content">
                        <h3>${event.title || ''}</h3>
                        <span class="date-location">${event.date || ''} | ${event.location || ''}</span>
                        <p>${event.summary || ''}</p>
                        <small class="source">المصدر: ${event.source || ''} ${linkHtml}</small>
                    </div>
                `;
                frag.appendChild(item);
            });
            timelineContainer.appendChild(frag);
        }

        const n = events ? events.length : 0;
        resultsCountEl.textContent = `عدد النتائج: ${n}`;
    };

    const applyFilters = () => {
        const term = (searchInput?.value || '').trim().toLowerCase();
        const fromStr = dateFromInput?.value || '';
        const toStr = dateToInput?.value || '';
        const sortOrder = sortSelect?.value === 'desc' ? 'desc' : 'asc';

        let filtered = allEvents.filter(e => {
            const dateStr = (e.date || '').slice(0, 10);
            if (!dateStr) return false;
            if (fromStr && dateStr < fromStr) return false;
            if (toStr && dateStr > toStr) return false;

            if (term) {
                const hay = `${(e.title || '').toLowerCase()} ${(e.summary || '').toLowerCase()} ${(e.location || '').toLowerCase()} ${(e.source || '').toLowerCase()}`;
                if (!hay.includes(term)) return false;
            }

            // مطابقة جميع الكلمات المختارة (AND)
            if (selectedKeywords.size) {
                const tokenSet = ensureEventTokens(e);
                for (const kw of selectedKeywords) {
                    if (!tokenSet.has(kw)) return false;
                }
            }

            return true;
        });

        filtered.sort((a, b) => {
            const da = (a.date || '').slice(0, 10);
            const db = (b.date || '').slice(0, 10);
            return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        });

        render(filtered);
    };

    const setDateLimits = (events) => {
        if (!events.length) return;
        const dates = events.map(e => getEventDate(e)).filter(isValidDate);
        if (!dates.length) return;
        const min = new Date(Math.min(...dates));
        const max = new Date(Math.max(...dates));
        const fmt = (d) => d.toISOString().slice(0, 10);
        if (dateFromInput) { dateFromInput.min = fmt(min); dateFromInput.max = fmt(max); }
        if (dateToInput) { dateToInput.min = fmt(min); dateToInput.max = fmt(max); }
    };

    // أحداث عناصر التحكم
    let searchDebounce;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(applyFilters, 200);
        });
    }
    sortSelect?.addEventListener('change', applyFilters);
    dateFromInput?.addEventListener('change', applyFilters);
    dateToInput?.addEventListener('change', applyFilters);
    clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        if (sortSelect) sortSelect.value = 'asc';
        // مسح الكلمات المختارة
        selectedKeywords.clear();
        if (keywordCloudEl) {
            keywordCloudEl.querySelectorAll('.tag.active').forEach(el => el.classList.remove('active'));
        }
        applyFilters();
    });

    // نقر الكلمات في السحابة
    if (keywordCloudEl) {
        keywordCloudEl.addEventListener('click', (e) => {
            const target = e.target.closest('.tag');
            if (!target) return;
            const kw = target.dataset.keyword;
            if (!kw) return;
            if (selectedKeywords.has(kw)) {
                selectedKeywords.delete(kw);
                target.classList.remove('active');
            } else {
                selectedKeywords.add(kw);
                target.classList.add('active');
            }
            applyFilters();
        });
    }

    // تحميل البيانات
    fetch('news.json')
        .then(response => {
            if (!response.ok) throw new Error('فشل تحميل ملف news.json. تأكد من وجود الملف.');
            return response.text();
        })
        .then(text => {
            let data;
            try {
                const cleaned = stripJsonComments(text);
                data = JSON.parse(cleaned);
            } catch (err) {
                console.error('فشل تحليل JSON:', err);
                throw new Error('فشل قراءة ملف الأخبار (JSON غير صالح).');
            }

            if (!Array.isArray(data)) throw new Error('صيغة البيانات غير صحيحة: المتوقع مصفوفة أحداث.');

            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            // تأكيد وجود الخاصية link لكل حدث
            allEvents = data.map(e => ({
                ...e,
                link: e.link ?? ''
            }));

            // تجهيز رموز الكلمات لكل حدث لمطابقة سريعة لاحقًا
            for (const e of allEvents) ensureEventTokens(e);

            // بناء السحابة
            const freq = buildKeywordFrequencies(allEvents);
            renderKeywordCloud(freq);

            // حدود التاريخ
            setDateLimits(allEvents);

            // عرض أولي
            render(allEvents);
        })
        .catch(error => {
            console.error('حدث خطأ:', error);
            timelineContainer.innerHTML = `<p style="color: red; text-align: center;">${error.message}</p>`;
            resultsCountEl.textContent = '';
        });
});