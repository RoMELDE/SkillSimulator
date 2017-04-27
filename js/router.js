define(['jquery', 'underscore', 'backbone', 'ui', 'view'], function ($, _, Backbone, Ui, View) {
    var app_router;
    function init() {
        var AppRouter = Backbone.Router.extend({
            routes: {
                "class/:id": "classRoute",
                "class/:id/share/:data": "classRoute",
                "lang/:lang": "languageChangeRoute",
                '*path': 'defaultRoute'
            },
            defaultRoute: function () {
                app_router.navigate("class/0", { trigger: true });
            }
        });
        // Initiate the router
        app_router = new AppRouter;

        app_router.on('route:classRoute', function (id, data) {
            console.log("route:classRoute");
            View.render(id,data);
        });
        app_router.on('route:languageChangeRoute', function (lang) {
            Ui.setLang(lang);
            app_router.navigate("unit");
            location.reload();
        });

        Backbone.history.start();
    }
    return {
        init: init
    };
});