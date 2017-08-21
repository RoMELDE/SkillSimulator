define(['jquery', 'underscore', 'backbone', 'data', 'ui', 'nouislider', 'LZString', 'bitset', 'text!../template/skillDesc.html', 'bootstrap', 'bootstrap-select', 'jquery.unveil', 'dom-to-image'], function ($, _, Backbone, Data, Ui, noUiSlider, LZString, BitSet, skillDescTemplate) {
    var activeMenu = "";
    var joblv = 10;
    var joblvList = [];
    var skillIdList = [];
    var requireSkillIdList = [];
    var classId = 0;

    $('#btnSaveImage').click(function () {
        var w = window.open('about:blank;', '_blank');
        $(w.document.body).append("生成中……");
        $('#main table').addClass('hide-button');
        domtoimage.toPng($('#main table')[0], { style: 'height:450px', bgcolor: '#fff' })
            .then(function (dataUrl) {
                $(w.document.body).empty();
                $(w.document.body).append($('<textarea style="width:100%;height:100px;">').val(window.location));
                $(w.document.body).append($('<img>').attr('src', dataUrl));
            })
            .catch(function (error) {
                console.error('生成图片异常', error);
            })
            .then(function () {
                $('#main table').removeClass('hide-button');
            });
    });
    var initUiLanguage = function () {
        $('[data-lang]').each(function () {
            var $this = $(this);
            var key = $this.data("lang");
            var value = Ui.getText(key);
            $this.text(value);
        });
    };
    var getActiveMenu = function () {
        return activeMenu;
    }
    var setActiveMenu = function (id) {
        activeMenu = id;
        $("nav.navbar .active").removeClass('active');
        //$("body>div[data-tab]").hide();
        var current = $("nav.navbar [data-class-id=" + id + "]");
        current.parents('li').addClass('active');
    };
    var updateJobText = function () {
        var text = "";
        _.each(joblvList, function (o) {
            if (o) {
                text += o + "/";
            }
        });
        $('#jobText').text(text.substring(0, text.length - 1));
    };
    var clear = function () {
        joblv = 10;
        joblvList = [];
        skillIdList = [];
        requireSkillIdList = [];
        updateJobText();
    };
    var render = function (id, savedata) {
        var self = this;
        if (id == 0) {
            return;
        }
        classId = id;
        setActiveMenu(id);
        //clear main
        $('#main').find("img").attr('src', ''); //stop image loading when doPage
        $('#main').empty();
        clear();
        //get data
        var skillMoulds = Data.getSkillMouldByClassId(id);

        var maxX = _.max(skillMoulds, function (o) { return o.Pos[0] }).Pos[0];
        var maxY = _.max(skillMoulds, function (o) { return o.Pos[1] }).Pos[1];
        //create table
        var $table = $("<table>");
        for (var i = 1; i <= maxY; i++) {
            var $tr = $("<tr>");
            for (var j = 1; j <= maxX + 1; j++) { //leave space
                $tr.append('<td>');
            }
            $table.append($tr);
        }

        _.each(skillMoulds, function (o, i) {
            var skill = Data.getSkillById(o.Id);
            var $td = $table.find('tr:eq(' + (o.Pos[1] - 1) + ') td:eq(' + (o.Pos[0] - 1) + ')');
            var $div = $('<div>')
                .addClass('skillContainer').addClass('notAvailable')
                .data('baseskill', skill).data('skillmould', o).data('lv', 0)
                .attr('skill-mould-id', o.Id);
            $td.append($div);

            $div.hover(function () { showSkillDesc.call($div); },
                function () { hideSkillDesc(skill.Id); });

            var $img = $('<img>');
            $img.attr('src', 'img/Skill/' + skill.Icon + '.png');
            $div.append($img);

            var $name = $('<div>').addClass('skillName').text(skill.NameZh);
            $div.append($name);

            var $lv = $('<div>').addClass('currentLevel').text("Lv.0");
            $div.append($lv);

            var $tdnext = $td.next();
            $tdnext
                .append($("<div>").addClass('btn-container').addClass('btn-group')
                    .append($('<button class="btn btn-sm btn-success skill-add skill-add-1" type="button">').append("<span class='glyphicon glyphicon-plus'>").click(function () {
                        addSkill.call($div);
                    }))
                    .append($('<button class="btn btn-sm btn-success skill-add skill-add-max clearfix" type="button">').append("<span class='glyphicon glyphicon-chevron-up'>").click(function () {
                        maxSkill.call($div);
                    })))
                .append($("<div>").addClass('btn-container').addClass('btn-group')
                    .append($('<button class="btn btn-sm btn-danger skill-sub skill-sub-1" type="button">').append("<span class='glyphicon glyphicon-minus'>").click(function () {
                        subSkill.call($div);
                    }))
                    .append($('<button class="btn btn-sm btn-danger skill-sub skill-sub-clear clearfix" type="button">').append("<span class='glyphicon glyphicon-trash'>").click(function () {
                        clearSkill.call($div);
                    })));
        });

        $('#main').append($table);
        renderCondition();
        refresh();
        if (savedata) {
            load(savedata);
        }

        setTimeout(function () {
            //a little delay to unveil for better unveil effect
            $('#main').find("img").unveil();
        }, 100);
    };

    var renderCondition = function () {
        $('#main td .has-connect').remove();
        $('.skillContainer').each(function (i, o) {
            var baseSkill = $(o).data('baseskill');
            var skillMould = $(o).data('skillmould');
            var conditionSkillMouldId = Data.getConditionSkillMouldIdBySkillMouldId(baseSkill.Id);
            if (conditionSkillMouldId) {
                var $condition = $('.skillContainer[skill-mould-id=' + conditionSkillMouldId + ']').parent();
                while ($condition.next().is($(o).parent()) == false) {
                    $condition.next().append('<div class="has-connect">').css('position', 'relative');
                    $condition = $condition.next();
                }
            }
        });
    };

    var showSkillDesc = function () {
        var $this = $(this);
        var $td = $(this).parent();
        var skill = $(this).data('skill');
        var lv = $(this).data('lv');
        var baseSkill = $(this).data('baseskill');
        var skillMould = $(this).data('skillmould');
        var nextSkill = baseSkill;
        if (skill) {
            var nextSkill = Data.getSkillById(skill.NextId);
        }

        var template = _.template(skillDescTemplate);
        var $div = $(template({
            lv: lv,
            skill: skill,
            baseSkill: baseSkill,
            skillMould: skillMould,
            nextSkill: nextSkill
        }));

        $('body').append($div.hide());
        var top = $this.position().top;
        var left = $td.position().left + $td.width();

        if ($this.position().top + $div.height() > $(window).height()) {
            top = $(window).height() - $div.height() - 10;
        }
        if ($td.position().left + $td.width() + $div.width() + 10 > $(window).width()) {
            left = $td.position().left - $div.width() - 10;
        }
        $div.css({ top: top + 'px', left: left + 'px' }).show();
    };
    var hideSkillDesc = function (skillId) {
        $('.skill-desc').remove();
    };

    var addSkill = function () {
        var $this = $(this);
        $this.removeClass('notAvailable');

        var skill = $(this).data('skill');
        var baseSkill = $(this).data('baseskill');
        var skillMould = $(this).data('skillmould');
        var nextSkill = baseSkill;
        if (skill) {
            var nextSkill = Data.getSkillById(skill.NextId);
        }
        if (nextSkill) {
            $this.data('skill', nextSkill);
            $this.data('lv', $this.data('lv') + 1);
            $this.find('.currentLevel').text("Lv." + $this.data('lv'));
            skillIdList.push(nextSkill.Id);
            joblv++;
            joblvList[nextSkill.Class] = (joblvList[nextSkill.Class] || 0) + 1;
            if (nextSkill.Condition && nextSkill.Condition.Skillid) {
                requireSkillIdList.push(nextSkill.Condition.Skillid);
            }
            refresh();
        }
    };
    var subSkill = function () {
        var $this = $(this);

        var skill = $(this).data('skill');
        //var baseSkill = $(this).data('baseskill');
        var skillMould = $(this).data('skillmould');
        var prevSkill = Data.getSkillByNextId(skill.Id);

        if (!prevSkill) {
            $this.addClass('notAvailable');
        }

        $this.data('skill', prevSkill);
        $this.data('lv', $this.data('lv') - 1);
        $this.find('.currentLevel').text("Lv." + $this.data('lv'));
        skillIdList = _.without(skillIdList, skill.Id);
        joblv--;
        joblvList[skill.Class] = (joblvList[skill.Class] || 0) - 1;
        if (skill.Condition && skill.Condition.Skillid) {
            requireSkillIdList = _.without(requireSkillIdList, skill.Condition.Skillid);
        }
        refresh();
    };
    var maxSkill = function () {
        var $tdnext = $(this).parent().next();
        while ($tdnext.find('.skill-add-1').isvisible()) {
            $tdnext.find('.skill-add-1').click();
        }
    };
    var clearSkill = function () {
        var $tdnext = $(this).parent().next();
        while ($tdnext.find('.skill-sub-1').isvisible()) {
            $tdnext.find('.skill-sub-1').click();
        }
    };

    $.fn.visible = function () {
        return this.css('visibility', 'visible');
    };

    $.fn.invisible = function () {
        return this.css('visibility', 'hidden');
    };

    $.fn.isvisible = function () {
        return this.css('visibility') === 'visible';
    };

    var refreshSkillAddButton = function () {
        var availableSkillMould = Data.getSkillMouldByClassId(classId, joblv);
        var currentClass = Data.getClassById(classId);
        $('.skillContainer').each(function (i, o) {
            var skill = $(o).data('skill');
            var baseSkill = $(o).data('baseskill');
            var skillMould = $(o).data('skillmould');
            var nextSkill = baseSkill;
            if (skill) {
                var nextSkill = Data.getSkillById(skill.NextId);
            }
            var $tdnext = $(o).parent().next();
            if (!nextSkill) {
                $tdnext.find('.skill-add').invisible();
            }
            else if (!_.any(availableSkillMould, function (p) { return skillMould.Id == p.Id; })) {
                $tdnext.find('.skill-add').invisible();
            }
            else if (!nextSkill.Condition) {
                $tdnext.find('.skill-add').visible();
            }
            //buggy,remove
            //else if (nextSkill.Condition.Joblv && nextSkill.Condition.Joblv > joblv) {
            //    $tdnext.find('.skill-add').invisible();
            //}
            else if (nextSkill.Condition.Skillid && (!_.contains(skillIdList, nextSkill.Condition.Skillid))) {
                $tdnext.find('.skill-add').invisible();
            }
            else if (currentClass.MaxJobLevel <= joblv) {
                $tdnext.find('.skill-add').invisible();
            }
            else {
                $tdnext.find('.skill-add').visible();
            }
        });
    };
    var refreshSkillSubButton = function () {
        $('.skillContainer').each(function (i, o) {
            var skill = $(o).data('skill');
            var $tdnext = $(o).parent().next();

            if (!skill) {
                $tdnext.find('.skill-sub').invisible();
                return;
            }

            var maxClassId = 1;
            _.each(joblvList, function (o, i) {
                if (o > 0) {
                    maxClassId = i;
                }
            });
            var currentParentClass = Data.getParentClassById(maxClassId);
            var currentClass = currentParentClass;
            var parentClass = Data.getParentClassById(currentClass.Id);
            var jobLv = 0, maxLv = 0;
            while (parentClass) {
                maxLv += currentClass.MaxJobLevel - parentClass.MaxJobLevel;
                jobLv += joblvList[currentClass.Id];
                currentClass = parentClass;
                parentClass = Data.getParentClassById(parentClass.Id);
            }

            var currentSkillClass = Data.getClassById(skill.Class);

            if (_.contains(requireSkillIdList, skill.Id)) {
                $tdnext.find('.skill-sub').invisible();
            }
            else if (maxLv > 0 && jobLv === maxLv && _.any(currentSkillClass.AdvanceClass, function (o) { return joblvList[o] > 0; })) {
                $tdnext.find('.skill-sub').invisible();
            }
            //    else if (!nextSkill.Condition) {
            //        $tdnext.find('.skill-add').show();
            //    }
            //    else if (nextSkill.Condition.Joblv && nextSkill.Condition.Joblv > (joblv + 1)) {
            //        $tdnext.find('.skill-add').hide();
            //    }
            //    else if (nextSkill.Condition.Skillid && (!_.contains(skillIdList, nextSkill.Condition.Skillid))) {
            //        $tdnext.find('.skill-add').hide();
            //    }
            else {
                $tdnext.find('.skill-sub').visible();
            }
        });
    };

    var refresh = function () {
        updateJobText();
        save();
        refreshSkillAddButton();
        refreshSkillSubButton();
    };

    var save = function () {
        var skillList = [];
        $('.skillContainer').each(function (i, o) {
            var baseSkill = $(o).data('baseskill');
            var skillMould = $(o).data('skillmould');
            var lv = $(o).data('lv');
            if (lv > 0) {
                skillList.push({ s: skillMould.Id, lv: lv });
            }
        });
        var data = stringifyCondition(skillList);
        Backbone.history.navigate("class/" + classId + "/share/" + data, { trigger: false });
    };
    var load = function (savedata) {
        var skillList = parseCondition(savedata);
        while (skillList.length) {
            _.each(skillList, function (o, i) {
                var $div = $('.skillContainer[skill-mould-id=' + o.s + ']');
                var $tdnext = $div.parent().next();
                if ($tdnext.find('.skill-add-1').isvisible()) {
                    for (var i = 0; i < o.lv; i++) {
                        $tdnext.find('.skill-add-1').click();
                    }
                    skillList = _.without(skillList, o);
                }
            });
        }
    };

    function stringifyCondition(condition) {
        return LZString.compressToEncodedURIComponent(JSON.stringify(condition));
    }

    function parseCondition(conditionJson) {
        return JSON.parse(LZString.decompressFromEncodedURIComponent(conditionJson));
    }

    return {
        initUiLanguage: initUiLanguage,
        getActiveMenu: getActiveMenu,
        setActiveMenu: setActiveMenu,
        render: render,
    };
});