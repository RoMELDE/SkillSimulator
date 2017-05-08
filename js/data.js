define(['jquery'], function () {
    var data = {};

    var init = function (type) {
        var dtd = $.Deferred();
        if (!type) {
            dtd.reject();
            return dtd.promise();
        }
        var key = "Table_" + type;
        var self = this;
        return self.isDataTooOld().then(function (force) {
            var json = localStorage.getItem(key);
            if (json && !force) {
                var jsondata = JSON.parse(json);
                console.log("Get data from cache. ", key);
                data[type] = jsondata;
                dtd.resolve();
                return dtd.promise();
            }
            else {
                var url = 'data/' + key + '.json'
                return $.ajax({
                    url: url,
                    cache: false,
                    dataType: "json"
                })
                    .done(function (jsondata) {
                        localStorage[key] = JSON.stringify(jsondata);
                        console.log("Get data from web. ", key);
                        data[type] = jsondata;
                    });
            }
        });
    };

    var isDataTooOld = function () {
        var dtd = $.Deferred();
        var key = "lastUpdate";
        var lastUpdate = localStorage.getItem(key);
        if (!lastUpdate) {
            dtd.resolve(true);
            return dtd.promise();
        }
        var url = 'data/lastUpdate.json'
        return $.ajax({
            url: url,
            cache: false,
            dataType: "json"
        }).then(function (data) {
            var local = JSON.parse(lastUpdate);
            var remote = data;
            return new Date(local).getTime() < new Date(remote).getTime();
        });
    };

    var getClassById = function (id) {
        return _.find(data.Class, function (p) { return p.Id === parseInt(id); });
    };

    var getParentClassById = function (id) {
        return _.find(data.Class, function (o) { return _.contains(o.AdvanceClass, id) });
    };

    var getSkillByClassId = function (id) {
        var self = this;
        var skillIds = [];
        var currentClass = getClassById(id);
        var parentClass = currentClass;
        while (parentClass.Id != 1) {
            skillIds = skillIds.concat(parentClass.Skill);
            parentClass = getParentClassById(parentClass.Id);
        }
        var skills = [];
        _.each(skillIds, function (o) {
            var skill = _.find(data.Skill, function (p) { return p.Id === o; });
            if (skill) {
                var skillDesc = _.find(data.SkillDesc, function (p) { return p.Id === skill.Desc.Id; });
                if (skillDesc) {
                    skill.Desc.Text = skillDesc.Desc;
                }
                //var skillMould = _.find(data.SkillMould, function (p) { return p.Id === o; });
                //if (skillMould) {
                //    skill.Mould = skillMould;
                //}
                skills.push(skill);
            }

        });
        return skills;
    };

    var getSkillById = function (id) {
        var self = this;
        var skill = _.find(data.Skill, function (p) { return p.Id === id; });
        if (skill) {
            var skillDesc = _.find(data.SkillDesc, function (p) { return p.Id === skill.Desc.Id; });
            if (skillDesc) {
                skill.Desc.Text = skillDesc.Desc;
                skill.Desc.Html = formatSkillText(skill.Desc);
            }
        }
        return skill || null;
    };

    var getSkillByNextId = function (nextid) {
        var self = this;
        var skill = _.find(data.Skill, function (p) { return p.NextId === nextid; });
        if (skill) {
            var skillDesc = _.find(data.SkillDesc, function (p) { return p.Id === skill.Desc.Id; });
            if (skillDesc) {
                skill.Desc.Text = skillDesc.Desc;
                skill.Desc.Html = formatSkillText(skill.Desc);
            }
        }
        return skill || null;
    };

    var getSkillMouldByClassId = function (id, joblv) {
        var self = this;
        var skillIds = [];
        var classes = [];
        var currentClass = getClassById(id);
        var parentClass = currentClass;
        while (parentClass.Id != 1) {
            classes.push(parentClass);
            parentClass = getParentClassById(parentClass.Id);
        }
        if (joblv) {
            classes = _.sortBy(classes, 'MaxJobLevel');
            var hasJoblv = true;
            _.each(classes, function (o, i) {
                if (hasJoblv) {
                    skillIds = skillIds.concat(o.Skill);
                }
                if (o.MaxJobLevel > joblv) {
                    hasJoblv = false;
                }
            });
        }
        else {
            _.each(classes, function (o, i) {
                skillIds = skillIds.concat(o.Skill);
            });
        }
        var skills = [];
        _.each(skillIds, function (o) {
            var skillMould = _.find(data.SkillMould, function (p) { return p.Id === o; });
            if (skillMould) {
                skills.push(skillMould);
            }
        });
        return skills;
    };

    var getConditionSkillMouldIdBySkillMouldId = function (id) {
        var self = this;
        var parentSkill = getSkillById(id);
        var conditionSkillId = 0;
        while (parentSkill) {
            if (parentSkill.Condition && parentSkill.Condition.Skillid) {
                conditionSkillId = parentSkill.Condition.Skillid;
                parentSkill = null;
            }
            else {
                parentSkill = getSkillByNextId(id);
            }
        }
        if (!conditionSkillId) {
            return 0;
        }
        else {
            parentSkill = getSkillById(conditionSkillId);
            while (parentSkill) {
                conditionSkillId = parentSkill.Id;
                parentSkill = getSkillByNextId(conditionSkillId);
            }
            return conditionSkillId;
        }
    };

    var formatSkillText = function (skillDesc) {
        var text = formatRichText(skillDesc.Text);
        for (var i = 0; i < skillDesc.Params.length; i++) {
            text = text.replace("%s", skillDesc.Params[i]);
        }
        return text.replace(/%%/g, "%");
    };

    var formatRichText = function (richText) {
        return richText.replace(/(?:\r\n|\r|\n|\\n)/g, "<br/>").replace(/\[-\]/g, "</span>").replace(/\[([A-Za-z0-9]{6})\]/g, "<span style='color:#$1'>");
    };

    return {
        data: data,
        init: init,
        isDataTooOld: isDataTooOld,
        getClassById: getClassById,
        getParentClassById: getParentClassById,
        getSkillById: getSkillById,
        getSkillByNextId: getSkillByNextId,
        getSkillByClassId: getSkillByClassId,
        getSkillMouldByClassId: getSkillMouldByClassId,
        getConditionSkillMouldIdBySkillMouldId: getConditionSkillMouldIdBySkillMouldId,
    };
});