/**
 * Created by Administrator on 2017/12/11.
 */

var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var iconv = require('iconv-lite');
var excel = require('excel-export');
var async = require('async');
var _ = require('underscore')._;

var main = "http://www.cdlr.gov.cn/detailnoright.aspx?id=";
var patten = "出让国有建设用地使用权公告";

var data = {};
data.name = "mysheet";
data.cols = [
    {
        caption:'位置',
        type:'string'
    },
    {
        caption:'用途',
        type:'string'
    },
    {
        caption:'链接',
        type:'string'
    }
];
data.rows = [];

function startRequest(url, cb, index) {
    http.get(url, function (res) {
        var chunks = [];

        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            var html = iconv.decode(Buffer.concat(chunks), 'gb2312');
            var $ = cheerio.load(html); //采用cheerio模块解析html
            var title = $('.dlefttitle').text();
            if (title.indexOf(patten) === -1)
            {
                cb(null);
                return;
            }
            $('tbody').find('tr').each(function (i, tr) {
                if (i === 0 || i === 1) return;
                var position = '';
                var use = '';
                $(tr).find('td').each(function (j, td) {
                    if (j === 2)
                    {
                        position = $(td).text();
                    }

                    else if (j === 4)
                    {
                        $(td).find('p').find('span').each(function (k, span) {
                            use += $(span).text();
                        });
                    }
                });
                if (position && use)
                    data.rows.push([position, use, url]);

            });
            console.log("success i="+index +" title="+title);
            cb(null);
        });
    });
}

var all = [];
for (var i = 105741; i >= 0 ; --i)
    all.push(i);

async.mapLimit(all, 20, function (i, cb) {
    startRequest(main+i,cb, i);
}, function (err) {
    if (data)
    {
        console.log('finish data.length='+_.size(data.rows));
        var result = excel.execute(data);
        fs.writeFile('data.xlsx', result, 'binary', function (err2) {
            process.exit();
        });
    }

    data = null;
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    console.log('Caught exception: length='+_.size(data.rows));
});

process.on('SIGINT', function() {
    if (data)
    {
        console.log('exit data.length='+_.size(data.rows));
        var result = excel.execute(data);
        fs.writeFile('exit.xlsx', result, 'binary', function (err) {
            process.exit();
        });
    }

    data = null;
});