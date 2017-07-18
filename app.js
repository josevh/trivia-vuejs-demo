(function() {
    var apiUrl = "https://opentdb.com/";

    var app = new Vue({
        el: '#app',
        data: {
            gameStarted: false,
            isLoading: false,
            apiToken: "",
            categories: [],
            categorySelectedId: "",
            questions: [],
            questionCurrentId: "",
            difficulty: "",
            questionCurrentNumber: 1
        },
        computed: {
            categorySelected: function() {
                return $.grep(app.categories, function(e) {
                    return e.id === app.categorySelectedId
                })[0];
            },
            roundScore: function() {
                return app.questions.reduce(function(sum, question){
                    return sum + (question.selectedAnswer === question.correctAnswer ? 1 : 0);
                }, 0);
            },
            roundOver: function() {
                return app.questionCurrentNumber > app.questions.length;
            }
        },
        methods: {
            startGame: function() {
                app.gameStarted = true;
                app.apiTokenRequest(function() {
                    app.apiCategoriesRequest();
                });
            },
            apiCategoriesRequest: function() {
                var endpoint = "api_category.php";
                var url = apiUrl + endpoint;

                app.isLoading = true;

                $.ajax({
                    url: url,
                    type: 'GET',
                    tryCount: 0,
                    retryLimit: 3,
                    success: function(data) {
                        data.trivia_categories.forEach(function(category) {
                            app.categories.push({
                                id: category.id,
                                name: category.name,
                                questionCount: -1
                            });
                            setTimeout(function() {
                                app.apiCategoryQuestionCountRequest(category.id);
                            }, 500);
                        });
                        app.isLoading = false;
                    },
                    error: function() {
                        if (app.categories.length === 0 && this.tryCount < this.retryLimit) {
                            this.tryCount++;
                            $.ajax(this);
                            return;
                        }
                        else {
                            throw ('FATAL: categories');
                            app.isLoading = false;
                        }
                    }
                });
            },
            apiCategoryQuestionCountRequest: function(categoryId) {
                // api_count.php?category=
                var endpoint = "api_count.php?";
                var params = "category=" + categoryId;
                var url = apiUrl + endpoint + params;

                var category = $.grep(app.categories, function(e) {
                    return e.id === categoryId
                })[0];
                var index = app.categories.indexOf(category);

                $.ajax({
                    url: url,
                    type: 'GET',
                    // tryCount: 0,
                    // retryLimit: 3,
                    success: function(data) {
                        var questionCount = '';
                        switch (app.difficulty) {
                            case 'hard':
                                questionCount = data.category_question_count.total_hard_question_count;
                                break;
                            case 'medium':
                                questionCount = data.category_question_count.total_medium_question_count;
                                break;
                            case 'easy':
                                questionCount = data.category_question_count.total_easy_question_count;
                                break;
                            default:
                                questionCount = data.category_question_count.total_question_count;
                        }
                        app.categories[index].questionCount = questionCount;
                    },
                    error: function() {
                        console.log('err');
                        // TODO: not fatal
                    }
                })
            },
            apiTokenRequest: function(callback) {
                var endpoint = "api_token.php?";
                var params = "command=request";
                var url = apiUrl + endpoint + params;

                app.isLoading = true;

                $.ajax({
                    url: url,
                    type: 'GET',
                    tryCount: 0,
                    retryLimit: 3,
                    success: function(data) {
                        if (data.response_code === 0) {
                            app.apiToken = data.token;
                            callback();
                        }
                        app.isLoading = false;
                    },
                    error: function() {
                        if (app.apiToken.length === 0 && this.tryCount < this.retryLimit) {
                            this.tryCount++;
                            $.ajax(this);
                            return;
                        }
                        else {
                            throw ('FATAL: token');
                            app.isLoading = false;
                        }
                    }
                });
            },
            apiQuestionsRequest: function(categoryId) {
                var endpoint = "api.php?";
                var params = "amount=10&encode=url3986&category=" + categoryId;
                if (app.difficulty !== 'any') {
                    params += '&difficulty=' + app.difficulty;
                }
                var url = apiUrl + endpoint + params;

                app.isLoading = true;

                $.ajax({
                    url: url,
                    type: 'GET',
                    tryCount: 0,
                    retryLimit: 3,
                    success: function(data) {
                        if (data.response_code === 0) {
                            data.results.forEach(function(elem) {
                                app.questions.push({
                                    category: elem.category,
                                    type: elem.type,
                                    difficulty: elem.difficulty,
                                    question: app.urlDecode(elem.question),
                                    correctAnswer: app.urlDecode(elem.correct_answer),
                                    incorrectAnswers: elem.incorrect_answers.map(app.urlDecode),
                                    shuffledAnswers: app.shuffleArray(elem.incorrect_answers.concat(elem.correct_answer)).map(app.urlDecode),
                                    selectedAnswer: ''
                                });
                            });
                            app.isLoading = false;
                        }
                    },
                    error: function() {
                        if (app.questions.length === 0 && this.tryCount < this.retryLimit) {
                            this.tryCount++;
                            $.ajax(this);
                            return;
                        }
                        else {
                            throw ('FATAL: questions');
                            app.isLoading = false;
                        }
                    }
                });
            },
            selectCategory: function(categoryId) {
                app.categorySelectedId = categoryId;
                app.apiQuestionsRequest(app.categorySelectedId);
            },
            // @credit https://git.daplie.com/Daplie/knuth-shuffle/blob/master/index.js
            shuffleArray: function(array) {
                var currentIndex = array.length,
                    temporaryValue, randomIndex;

                // While there remain elements to shuffle...
                while (0 !== currentIndex) {

                    // Pick a remaining element...
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;

                    // And swap it with the current element.
                    temporaryValue = array[currentIndex];
                    array[currentIndex] = array[randomIndex];
                    array[randomIndex] = temporaryValue;
                }

                return array;
            },
            selectDifficulty: function(difficulty) {
                app.difficulty = difficulty;
            },
            selectQuestionAnswer: function(question, answer) {
                var index = app.questions.indexOf(question);
                app.questions[index].selectedAnswer = answer;
                
                app.questionCurrentNumber++;
            },
            startNewRound: function() {
                app.categorySelectedId = "";
                app.questionCurrentId = "";
                app.questions = [];
                app.questionCurrentNumber = 1;
                app.difficulty = "";
                
            },
            endGame: function() {
                app.startNewRound();
                app.gameStarted = false;
            },
            urlDecode: function(str) {
                return decodeURIComponent((str + '').replace(/\+/g, '%20'));
            }
        },
        filters: {
            capitalize: function(value) {
                if (!value && value !== 0) return ''
                value = value.toString()
                return value.charAt(0).toUpperCase() + value.slice(1)
            }
        }
    });
})();
