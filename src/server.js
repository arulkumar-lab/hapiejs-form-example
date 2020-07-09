const Hapi = require("@hapi/hapi");
const Path = require("path");
const handlebar = require("handlebars");
const vision = require("@hapi/vision");
const Boom = require("@hapi/boom");
const Joi = require("@hapi/joi");
const Inert = require("@hapi/inert");

const init = async () => {
  const server = Hapi.server({
    port: 4000,
    host: "localhost",
    routes: {
      files: {
        relativeTo: Path.join(__dirname, "public")
      }
    }
  });

  await server.register(Inert);
  await server.register(vision);

  server.route({
    method: "GET",
    path: "/css/{file*}",
    handler: {
      directory: {
        path: "css",
        listing: true
      }
    }
  });

  server.views({
    engines: {
      html: handlebar
    },
    relativeTo: __dirname,
    path: "public",
    helpersPath: "./public/helpers",
    partialsPath: "./public/partials",
    isCached: false
  });

  server.route({
    method: "GET",
    path: "/",
    handler(request, h) {
      return h.view("index", {
        title: "Hapie page",
        year: new Date().getFullYear()
      });
    }
  });
  server.route({
    method: "GET",
    path: "/login",
    handler(request, h) {
      return h.view("login", {
        title: "Hapie Login page",
        year: new Date().getFullYear()
      });
    }
  });

  const preResponse = function(request, h) {
    const { response } = request;
    if (!response.isBoom) {
      return h.continue;
    }

    const error = response;
    const ctx = {
      message:
        error.output.statusCode === 404
          ? "page not found"
          : "something went wrong"
    };

    return h.view("error", ctx).code(error.output.statusCode);
  };

  server.route({
    method: "post",
    path: "/loginValidateForm",
    handler(request, h) {
      return h.view("index", {
        title: "Hapie sucess page",
        year: new Date().getFullYear(),
        secureMessages: "Important! logged user secured content! ",
        username: request.payload.name
      });
    },
    config: {
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          password: Joi.string().required()
        }),
        options: {
          abortEarly: false
        },
        failAction(request, h, err) {
          const errorsMsg = {};
          for (let i = 0; i < err.details.length; ++i) {
            if (!errorsMsg.hasOwnProperty(err.details[i].path)) {
              errorsMsg[err.details[i].path] = err.details[i].message;
            }
          }

          return h
            .view("login", {
              err,
              values: request.payload,
              errors: errorsMsg,
              title: "Login page error",
              year: new Date().getFullYear()
            })
            .code(400)
            .takeover();
        }
      }
    }
  });

  server.ext("onPreResponse", preResponse);

  await server.start();
  console.log(`Hapie Server started %s${server.info.uri}`);
};

process.on("unhandledRejection", err => {
  process.exit();
});

init();
