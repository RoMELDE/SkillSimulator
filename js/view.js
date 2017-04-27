define(['jquery', 'underscore', 'backbone', 'data', 'ui', 'nouislider', 'LZString', 'bitset', 'text!../template/skillDesc.html', 'bootstrap', 'bootstrap-select', 'jquery.unveil'], function ($, _, Backbone, Data, Ui, noUiSlider, LZString, BitSet, skillDescTemplate) {
    var activeMenu = "";
    var joblv = 10;
    var joblvList = [];
    var skillIdList = [];
    var requireSkillIdList = [];
    var classId = 0;

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
                .data('baseskill', skill).data('skillmould', o).data('lv', 0);
            $td.append($div);

            $div.hover(function () { showSkillDesc.call($div); },
                function () { hideSkillDesc(skill.Id); });

            var $img = $('<img>');
            $img.attr('src', '/img/Skill/' + skill.Icon + '.png');
            $div.append($img);

            var $name = $('<div>').addClass('skillName').text(o.Name);
            $div.append($name);

            var $tdnext = $td.next();
            $tdnext
                .append($('<input class="btn btn-xs btn-block btn-success skill-add" type="button" value="+">').click(function () {
                    addSkill.call($div);
                }))
                .append($('<input class="btn btn-xs btn-block btn-success skill-add" type="button" value="M">').click(function () {
                    maxSkill.call($div);
                }))
                .append($('<input class="btn btn-xs btn-block btn-danger skill-sub" type="button" value="-">').click(function () {
                    subSkill.call($div);
                }))
                //.append($('<input class="btn btn-xs btn-block btn-info skill-clear" type="button" value="C">').click(function () {
                //    clearSkill.call($div);
                //}))
                ;
        });

        $('#main').append($table);
        refreshSkillButton();

        setTimeout(function () {
            //a little delay to unveil for better unveil effect
            $('#main').find("img").unveil();
        }, 100);
    };

    var showSkillDesc = function () {
        var $this = $(this);
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

        var top = $this.position().top + $this.height() / 3;
        var left = $this.position().left + $this.width();

        if ($this.position().top + $this.height() / 3 + $div.height() > $(window).height()) {
            top = $(window).height() - $div.height();
        }
        if ($this.position().left + $this.width() + $div.width() > $(window).width()) {
            left = $this.position().left - $div.width();
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
            skillIdList.push(nextSkill.Id);
            joblv++;
            joblvList[nextSkill.Class] = (joblvList[nextSkill.Class] || 0) + 1;
            if (nextSkill.Condition && nextSkill.Condition.Skillid) {
                requireSkillIdList.push(nextSkill.Condition.Skillid);
            }
            updateJobText();
            refreshSkillButton();
        }
    };

    var maxSkill = function () {
        var $tdnext = $(this).parent().next();
        while ($tdnext.find('.skill-add').isvisible()) {
            $tdnext.find('.skill-add').click();
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
        skillIdList = _.without(skillIdList, skill.Id);
        joblv--;
        joblvList[skill.Class] = (joblvList[skill.Class] || 0) - 1;
        if (skill.Condition && skill.Condition.Skillid) {
            requireSkillIdList = _.without(requireSkillIdList, nextSkill.Condition.Skillid);
        }
        updateJobText();
        refreshSkillButton();
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

            var currentClass = Data.getClassById(skill.Class);
            var parentClass = Data.getParentClassById(skill.Class);
            var currentClassMaxLv = currentClass.MaxJobLevel - parentClass.MaxJobLevel;

            if (_.contains(requireSkillIdList, skill.Id)) {
                $tdnext.find('.skill-sub').invisible();
            }
            else if (joblvList[skill.Class] === currentClassMaxLv && _.any(currentClass.AdvanceClass, function (o) { return joblvList[o] > 0; })) {
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

    var refreshSkillButton = function () {
        refreshSkillAddButton();
        refreshSkillSubButton();
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