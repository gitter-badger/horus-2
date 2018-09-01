App = {
  
  ipfsAddress:  'ipfs.infura.io',
  ipfsPort: '5001',
  numberOfPosts: 10,        // Number of posts loaded when the user reaches the bottom of the page.
  decimalValues: 1000,      // 10 ** the number of decimal values for reputation.
  withdrawalThreshold: 50,  // Minimum balance difference for reputation to be considered available for withdrawal.
  inFavor: true,            // True if the next posted post is in favor of the post it points to.

  contracts:        {},
  posts:            {},
  validationPosts:  {},
  postsData:        {},
  postsContent:     {},
  
  currentTab: 0,  // Index of the displayed tab [explore, posts, votes, pins].
  voteIndex:  0,  // Index of the selected vote [p.inFavor, p.against, v.inFavor, v.against]
  pointToID:  0,  // ID of the post the next posted post points to.

  pendentWithdrawalPosts: [], // IDs of the posts with reputation available for withdrawal.

  userData:           undefined,
  web3Provider:       undefined,
  mainInstance:       undefined,
  account:            undefined,
  prevScrollpos:      undefined,
  // Contract variables
  minDiff:            undefined,
  shareBasePrice:     undefined,
  priceIncrease:      undefined,

  /*_____INITIALIZATION_____*/

  // Function names are self-explanatory (hopefully)...

  init: function() {
    App.initWeb3();
    App.bindEvents();
    App.initContractAndUpdate();
  },

  initWeb3: function() {
    if ( typeof web3 !== 'undefined' ) {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new web3.providers.HttpProvider('http://localhost:8445');
      web3 = new Web3(App.web3Provider);
    }
  },

  initContractAndUpdate: function() {
    $.getJSON('Main.json', function(MainArtifact) {
      App.contracts.Main = TruffleContract(MainArtifact);
      App.contracts.Main.setProvider(App.web3Provider);
      App.contracts.Main.deployed().then(function(instance) {
        App.mainInstance = instance;
        App.update();
        var posts = App.getQueryVariable('id');
        if (posts) {
          App.loadPostSearch(posts.split("-"));
          return;
        }
        var tab;
        App.initPosts();
      });
    });
  },

  // bindEvents() could look cleaner...

  bindEvents: function() {
    $(document).ready(function() {

      $(document).on('click', 'button#writing-block__post-btn', App.post);
      $(document).on('click', 'span#message__claimGift', App.claimGift);
      $(document).on('click', 'button.data-block__vote-btn', App.selectVote);
      $(document).on('click', 'button.voting-block__vote-btn', App.vote);
      $(document).on('click', 'button.post-footer__pin', App.pinPost);
      $(document).on('click', 'span#post-search__icon', App.navbarPostSearch);
      $(document).on('click', 'button.post-footer__pointTo', App.toggleDirectionMenu);
      $(document).on('click', 'span#withdrawReputation', App.withdrawReputation);
      $(document).on('focusin change keyup mouseup paste', 'input.voting-block__shares-input', App.handleShares);

      $(document).on('click', 'span.glyphicon-navbar__hamburger', function() { $('div#navbar__buttons').slideToggle(250) });
      $(document).on('click', 'button.point-direction__inFavor-btn', function() { App.inFavor = true; App.pointTo(); App.toggleDirectionMenu() });
      $(document).on('click', 'button.point-direction__against-btn', function() { App.inFavor = false; App.pointTo(); App.toggleDirectionMenu() });
      
      $(document).on('click', 'span.pointsTo-block__title', function() {
        var postElement = $(event.target).parents('div.content__post'),
            newID = postElement.attr("point");
        App.showAnotherPost(postElement, newID);
      });

      $(document).on('click', 'div.roots-block__root', function() {
        var target = $(event.target),
            postElement = target.parents('div.content__post'),
            newID = target.attr("id");
        App.showAnotherPost(postElement, newID);
      });

      $(document).on('click', 'button#reputation-and-refresh__refresh-btn', function() {
        App.update();
        App.initPosts();
      });

      $(document).on('click', 'button.post-footer__refresh', function() {
        var target = $(event.target),
            post = target.parents('div.content__post'),
            postID = post.attr("id");
        App.refreshPost(post, postID);
        App.loadRoots(post, postID, true);
      });

      $(document).on('click', 'button.post-footer__roots', function() {
        var target = $(event.target),
            roots = target.parents('div.content__post').find('div.post__roots-block');
        roots.slideToggle(50 * roots.find("div.roots-block__root").length);
        target.toggleClass('glyphicon-menu-down').toggleClass('glyphicon-menu-up');
      });

      $(document).on('click', 'span#writing-block__pointTo-remove', function() {
        App.pointToID = 0;
        $('span#writing-block__pointTo-label').hide(250);
      }); 

      $(document).on('click', 'span#navbar__explore', function() {
        var target = $(event.target);
        
        App.getLoadingParameters().then(function(paramenters) {
          var [index, numberOfPostsToLoad] = paramenters,
              posts = [];
          for (var ii = 0; ii < numberOfPostsToLoad; ii++) { posts.push(ii + index); }
          App.menuTabClick(target, posts);
          $('button#reputation-and-refresh__refresh-btn').show();
          App.currentTab = 0;
        });
      });

      $(document).on('click', 'span#navbar__posts', function() {
        App.menuTabClick($(event.target), Object.keys(App.getStorage('myPosts') || {}));
        $('button#reputation-and-refresh__refresh-btn').hide();
        App.currentTab = 1;
      });

      $(document).on('click', 'span#navbar__votes', function() {
        App.menuTabClick($(event.target), Object.keys(App.getStorage('votedPosts')  || {}));
        $('button#reputation-and-refresh__refresh-btn').hide();
        App.currentTab = 2;
      });

      $(document).on('click', 'span#navbar__pins', function() {
        App.menuTabClick($(event.target), Object.keys(App.getStorage('pinnedPosts')  || {}));
        $('button#reputation-and-refresh__refresh-btn').hide();
        App.currentTab = 3;
      });
      
      $(document).on('focusin change keyup paste', 'input#writing-block__title-input', function() {
        App.showAvailableCharacters(75);
      });

      $(document).on('focusin change keyup paste', 'textarea#writing-block__post-text', function() {
        App.showAvailableCharacters(500);
      });

      $(document).on('focusout', 'input#writing-block__title-input,textarea#writing-block__post-text', function() {
        if (!$('input#writing-block__title-input').is(":focus") && !$('textarea#writing-block__post-text').is(":focus")) {
          $('button#writing-block__post-btn').find('span').text("Post");
        }
      });

      $(document).on('keyup', 'input#post-search__input', function() {
        if (event.which == 13) { App.navbarPostSearch(); }
      });

      window.addEventListener('resize', function() {
        App.adjustToWindow()
      });

      window.addEventListener('scroll', function () {
        var currentScrollPos = $(window).scrollTop();
        if (App.prevScrollpos > currentScrollPos) {
          $("div#navbar").css("top", 0);
        } else {
          var navbar = $("div#navbar")
          navbar.css("top", -2 * navbar.height());
        }
        App.prevScrollpos = currentScrollPos; // INDEX
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 10 && App.currentTab == 0) {
          var [index, numberOfPostsToLoad] = App.loadingParameters;
          if (index > numberOfPostsToLoad) {
            index -= numberOfPostsToLoad;
            numberOfPostsToLoad = index >= numberOfPostsToLoad ? numberOfPostsToLoad : index;
            App.loadingParameters = [index, numberOfPostsToLoad];
            App.loadNewPosts(index, numberOfPostsToLoad);
          }
        }
      });

    });

  },

  /*_____UPDATING_____*/

  /*Updates UI, Ethereum Account, and contract data.*/
  update: function() {

    $('span.navbar__tab').css('font-weight', 'normal');
    $('span#navbar__explore').css('font-weight', 'bold');
    App.currentTab = 0;

    App.adjustToWindow();

    for (var object in [App.posts, App.validationPosts, App.postsData, App.userData]) { // Does this work? [???]
      for (var member in object) delete object[member];
    }

    web3.eth.getAccounts(function(err, res) {
      
      App.account = res[0];
      writeSpace = $('#writing-block');
      
      if (res[0]) {
        writeSpace.slideDown(250);
        $('span#reputation-and-refresh__reputation, div#navbar__buttons > div, button.post-footer__pointTo, button.post-footer__pin, button.data-block__vote-btn').show();
        $('div#navbar__hamburger').addClass('visible');

        $('div#navbar__post-search')
          .removeClass('col-xs-10')
          .addClass('col-xs-12 col-md-2')
          .prependTo('div#navbar__buttons');
        
        $('div#navbar__reputation-and-refresh')
          .removeClass('col-xs-2')
          .addClass('col-xs-9 col-sm-3 col-md-2');
        
        App.updateReputation();
      
      } else {
        writeSpace.slideUp(250);
        $('span#reputation-and-refresh__reputation, div#navbar__buttons > div:not(#navbar__post-search), button.post-footer__pointTo, button.pi, button.data-block__vote-btn').hide();
        $('div#navbar__hamburger').removeClass('visible');

        $('div#navbar__post-search')
          .removeClass('col-xs-12 col-md-2')
          .addClass('col-xs-10')
          .prependTo('div#navbar > div.container');
        
        $('div#navbar__reputation-and-refresh')
          .removeClass('col-xs-9 col-sm-3 col-md-2')
          .addClass('col-xs-2');
      }
    
    });

    Promise.all([
      App.mainInstance.minDiff.call(),
      App.mainInstance.shareBasePrice.call(),
      App.mainInstance.priceIncrease.call(),
    ]).then(function(values) {
      App.minDiff = parseInt(values[0]);
      App.shareBasePrice = parseInt(values[1]);
      App.priceIncrease = parseInt(values[2]);
    });

  },

  /*Adjustes the UI to the window's size.*/
  adjustToWindow: function() {
    var navbarButtons = $('div#navbar__buttons');
    if (window.innerWidth < 992) {
      $('div#navbar__reputation-and-refresh').insertBefore(navbarButtons);
      navbarButtons.hide();
    } else {
      $('div#navbar__reputation-and-refresh').insertAfter(navbarButtons);
      navbarButtons.show();
    }
  },

  /*_____LOADING POSTS_____*/

  /*Loads posts.*/
  initPosts: function() {

    var postsBlock = $('div#posts-block'),
        loader = $('div#content__loader');

    postsBlock.empty();
    loader.insertBefore('div#posts-block');

    App.getLoadingParameters()
      .then(function(paramenters) { App.loadNewPosts(paramenters[0], paramenters[1]); })
      .then(function() { loader.insertAfter(postsBlock); });
  },

  /**
   * Creates and loads posts.
   * @param {int} index Smallest of the IDs of the posts to be loaded.
   * @param {int} numberOfPostsToLoad
   */
  loadNewPosts: function(index, numberOfPostsToLoad) {

    App.loadPosts(
      numberOfPostsToLoad,
      function(_ii) { return undefined; },
      function(_ii) { return _ii + index; },
      function() { return; }
    );

  },

  /**
   * Load new posts over existing ones.
   * @param {Array<int>} postsToLoad Array containing the IDs of the posts to be loaded.
   */
  loadPostsOver: function(postsToLoad) {
    
    var postsBlock = $('div#posts-block'),
        posts = space.children();

    if (postsToLoad.length > posts.length) {
      postsBlock.append(App.postTemplate(0).repeat(postsToLoad.length - posts.length));
    } else {
      posts.slice(postsToLoad.length, posts.length).remove();
    }

    posts = postsBlock.children();

    App.loadPosts(
      postsToLoad.length,
      function(_ii) { return posts.eq(-_ii-1); },
      function(_ii) { return postsToLoad[_ii]; },
      function(_postID, _postElement) { _postElement.attr('id', _postID).find('span.post-heading__postID').text(_postID); }
    );
  
  },

  /**
   * Load posts.
   * @param {int} numberOfPostsToLoad
   * @param {function(ii)} getPostElement Function that returns the post over which the post ii will be loaded.
   * @param {function(ii)} getPostID Function that returns the ID of the post ii.
   * @param {function(_postID, _postElement)} otherFunction Function that takes getPostElement(ii) and getPostID(ii)
   *                                                        as inputs.
   */
  loadPosts: function(numberOfPostsToLoad, getPostElement, getPostID, otherFunction) {

    $('div#content__loader').show();

    var pinnedPosts = App.getStorage("pinnedPosts") || {},
        loadPostPromises = [],
        loadPostContentPromise,
        postElement,
        postID;
      
    for (var ii = numberOfPostsToLoad - 1; ii >= 0; ii--) {
      postElement = getPostElement(ii);
      postID = getPostID(ii);
      otherFunction(postID, postElement);
      [postElement, loadPostContentPromise] = App.loadPostContent(postElement, postID);
      postElement.find('button.post-footer__pin').css("color", `${pinnedPosts[postID] ? "#35E093" : "#36382E"}`);
      loadPostPromises.push(loadPostContentPromise);
      loadPostPromises.push(App.loadRoots(postElement, postID));
    }

    Promise.all(loadPostPromises).then(function() {
      $('div#content__loader').hide();
    }).catch(function(error) {
      console.error(error);
      $('div#content__loader').hide();
    });

  },

  /**
   * Loads the content of a post.
   * @param {div.content__post} postElement
   * @param {int} postID
   * @return [{div.content__post}, {Promise}]
   */
  loadPostContent: function(postElement, postID) {

    postID = postID || postElement.attr('id');

    if (!postElement) {
      if (!postID) { return; }
      var postsBlock = $('div#posts-block'),
          postHTML = App.postTemplate(postID);
      postsBlock.append(postHTML);
      postElement = postsBlock.children().eq(-1);
    }

    var postData;

    loadPostContentPromise = App.getPostData(postID, true).then(function(data) {
      postData = data;
      var date = new Date(postData.timestamp * 1000),
          ipfsHash = App.hashFromPost(data);
      App.getContent(postID, ipfsHash).then(function(postContent) {
        var lines = postContent.text.split("&#n"),
            textBox = postElement.find('div.post__text-box')
        postElement.find('div.post__text-box').html(`<p class="text-box__title"><b>${postContent.title}</b></p>`);
        for (var line in lines) postElement.find('div.post__text-box').append(`<p>${lines[line]}</p>`);
      });

      postElement.find('span.post-heading__timestamp').text(date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear());
      postElement.find('a.ipfsHash').attr('href', "https://ipfs.io/ipfs/" + ipfsHash);
      
      if (postData.pointsToID > 0) {
        postElement.attr("point", postData.pointsToID);
        postElement.find('div.post-heading__pointsTo-block').css("display", "inline");
        postElement.find('span.pointsTo-block__ID').text(postData.pointsToID);
        if (postData.inFavor) {
          postElement.find('span.pointsTo-block__postiton-point')
            .removeClass('glyphicon-triangle-bottom triangle--down')
            .addClass('glyphicon-triangle-top triangle--up'); 
        } else {
          postElement.find('span.pointsTo-block__postiton-point')
            .removeClass('glyphicon-triangle-top triangle--up')
            .addClass('glyphicon-triangle-bottom triangle--down');
        }

        App.getPostData(postData.pointsToID).then(function(data) {
          return App.getContent(postData.pointsToID, App.hashFromPost(data));
        }).then(function(content) {
          postElement.find('span.pointsTo-block__title').text(content.title);
        });
        
      } else {
        postElement.find('div.post-heading__pointsTo-block').css("display", "none");
      }

      App.refreshPost(postElement, postID);
    
    });

    return [postElement, loadPostContentPromise];

  },

  /**
   * Loads the data of a post.
   * @param {div.content__post} postElement
   * @param {int} postID
   */
  refreshPost: function(postElement, postID) {

    postID = postID || postElement.attr('id');
    
    function setValues(getPost, getVote, p) {
      var post, vote, inFavorDepositFraction, againstDepositFraction;
      getPost(postID, true).then(function(postData) {
        post = postData;
        inFavorDepositFraction = post.inFavorDeposit / (post.inFavorDeposit + post.inFavorReturns + post.againstProfit);
        againstDepositFraction = post.againstDeposit / (post.againstDeposit + post.againstReturns + post.inFavorProfit);
        return App.account ? getVote.call(postID, { from: App.account }) : [0, 0, 0, 0];
      }).then(function(vote) {
        App.setCellValueShares(postElement, 'span.data-block__infavor-shares', parseInt(vote[0]), post.inFavorShares, p);
        App.setCellValueShares(postElement, 'span.data-block__against-shares', parseInt(vote[1]), post.againstShares, p);
        App.setCellValueDeposit(postElement, 'span.data-block__infavor-deposit', parseInt(vote[2] * inFavorDepositFraction) , post.inFavorDeposit, p);
        App.setCellValueDeposit(postElement, 'span.data-block__against-deposit', parseInt(vote[3] * againstDepositFraction), post.againstDeposit, p);
      });
    }

    setValues(App.getPost, App.mainInstance.getVote, 0);
    setValues(App.getValidationPost, App.mainInstance.getValidation, 1);

    App.getPostData(postID, true).then(function(data) {
      postElement.find('span.post-heading__reputation').text(data.reputation / App.decimalValues | 0);
    });

  },

  // Reeeally freestyled this bit... 
  // Will try to make it cleaner ASAP.

  /**
   * Loads the roots of a post.
   * @param {div.content__post} postElement
   * @param {int} postID
   * @param {bool} update Wether to update root data or load it from memory.
   * @return {Promise}
   */
  loadRoots: function(postElement, postID, update) {
    
    postID = postID || postElement.attr('id');

    return App.getPostData(postID, true).then(function(postData) {
      if (postData.rootPosts.length == 0) { return; }
      else { postElement.find('button.post-footer__roots').show(); }
      
      function _setReputation(_summary, _reputation, _hasRoots, _postData, _postValidation) {
        var lastPropagatedAmount = _postData.lastPropagatedAmount * (_postData.inFavor ? 1 : -1);
        _reputation = (_hasRoots ? "" : "*") + _reputation;
        _reputation = _postValidation.inFavorDeposit - _postValidation.againstDeposit < App.minDiff ? `[${_reputation}]` : _reputation;
        _summary.find('span.reputation-block__reputation').text(_reputation);
        if (lastPropagatedAmount >= 0) {
          _summary.find('span.reputation-block__change')
            .text("+" + (lastPropagatedAmount / App.decimalValues | 0))
            .removeClass("triangle--down")
            .addClass("triangle--up");
        } else {
          _summary.find('span.reputation-block__change')
            .text(lastPropagatedAmount / App.decimalValues | 0)
            .removeClass("triangle--up")
            .addClass("triangle--down");
        }
        if (_postData.inFavor == true) {
          _summary.find('span.root__reputation-triange')
            .removeClass('glyphicon-triangle-bottom triangle--down')
            .addClass('glyphicon-triangle-top triangle--up'); 
        } else {
          _summary.find('span.root__reputation-triange')
            .removeClass('glyphicon-triangle-top triangle--up')
            .addClass('glyphicon-triangle-bottom triangle--down');
        }
 
        return _summary;
      }

      function _returnPromise(_rootPostID) {
        return new Promise(function (resolve, reject) {
          App.getPostData(_rootPostID, update).then(function(postData) {
            resolve(postData, _rootPostID);
          })
        });
      }

      var rootsBlock = postElement.find('div.post__roots-block'),
          roots = rootsBlock.children(),
          loadingPromises = [];

      for (var ii = roots.length; ii < postData.rootPosts.length; ii++) {
        loadingPromises.push(
          new Promise(function (resolve, reject) {
            Promise.resolve(postData.rootPosts[ii]).then(function(rootID) {
              var rootPostID = rootID,
                  rootElement,
                  postData,
                  postValidation;
              Promise.all([App.getPostData(rootPostID, update), App.getValidationPost(rootPostID, update)]).then(function(data) {
                [postData, postValidation] = data;
                return App.getContent(rootPostID, App.hashFromPost(postData));
              }).then(function(postContent) {
                rootElement = App.rootTemplate(rootPostID, postData.reputation / App.decimalValues | 0, postContent.title);
                if (postData.reputation == 0) {
                  App.getPost(rootPostID, update).then(function(post) {
                    rootsBlock.prepend(
                      _setReputation($(rootElement), (post.inFavorDeposit - post.againstDeposit) / App.decimalValues | 0, false, postData, postValidation).html()
                    );
                    resolve();
                  });
                } else {
                  rootsBlock.prepend(_setReputation($(rootElement), postData.reputation / App.decimalValues | 0, true, postData, postValidation).html());
                  resolve();
                }
              });
            });
          })
        );
      }

      for (var jj = 0; jj < roots.length; jj++) {
        loadingPromises.push(
          new Promise(function (resolve, reject) {
            Promise.resolve([postData.rootPosts[jj], rootsBlock.find(`div[id=${postData.rootPosts[jj]}]`)]).then(function(result) {
              var [rootPostID, rootElement] = result,
                  postData,
                  postValidation;
              Promise.all([App.getPostData(rootPostID, update), App.getValidationPost(rootPostID, update)]).then(function(data) {
                [postData, postValidation] = data;
                if (postData.reputation == 0) {
                  App.getPost(rootPostID, update).then(function(post) {
                    _setReputation(rootElement, (post.inFavorDeposit - post.againstDeposit) / App.decimalValues | 0, false, postData, postValidation);
                    resolve();
                  });
                } else {
                  _setReputation(rootElement, postData.reputation / App.decimalValues | 0, true, postData, postValidation);
                  resolve();
                }
              });
            });
          })
        );
      }
      
      return loadingPromises;

    }).then(function(loadingPromises) {
      if (loadingPromises) {
        Promise.all(loadingPromises).then(function() {
          var roots = postElement.find('div.post__roots-block').children();
          if (roots.length == 1) {
            roots.eq(0).removeClass('roots-block__root--bot roots-block__root--mid roots-block__root--top').addClass('roots-block__root--single');
          } else {
            roots.removeClass('roots-block__root--bot roots-block__root--top roots-block__root--single').addClass('roots-block__root--mid');
            roots.eq(0).removeClass('roots-block__root--bot roots-block__root--mid roots-block__root--single').addClass('roots-block__root--top');
            roots.eq(-1).removeClass('roots-block__root--mid roots-block__root--top roots-block__root--single').addClass('roots-block__root--bot');
          }
        });
      }
    });

  },

  /*_____POSTING_____*/

  // Post32() does not return expected value. [!!!]

  /*Posts a post.*/
  post: function() {

    var reputation,
        postFee;

    App.mainInstance.getUser.call(App.account).then(function(userData) {
      reputation = userData.reputation;
      return App.mainInstance.postFee.call();
    }).then(function(fee) {
      postFee = parseInt(fee);
      return App.mainInstance.maxInvestedFraction.call();
    }).then(function(maxInvestment) {
      
      if (postFee / reputation * 1000000 > parseInt(maxInvestment)) { return; }

      $('button#writing-block__post-btn').find('span').text("");
      $('div#btn-post__loader').css("display", "block");

      var ipfs = window.IpfsApi(App.ipfsAddress, App.ipfsPort, {protocol: 'https'}),
          postTitle = $('#writing-block__title-input').val(),
          postText = $('#writing-block__post-text').val();

      postText = postText.replace('\n', '&#n');

      if (postText.length > 500 || postTitle.length > 75) { return; }

      var postContent = {"title": postTitle, "text": postText},
          dataBuffer = buffer.Buffer(JSON.stringify(postContent));
      ipfs.files.add(dataBuffer).then(function(data) {
        var multihash = App.fromMultihash(data[0].hash);
        return App.mainInstance.post32(multihash[0], multihash[1], App.pointToID, App.inFavor, { from: App.account });
      
      // Posts' IDs are not stored in 'myPosts'. [!!!]
      // post32() returns transaction, not ID.

      }).then(function(postsLength) {
        $('span#writing-block__pointTo-label').hide(250);
        $('input#writing-block__title-input').val("");
        $('textarea#writing-block__post-text').val("");
        $('div#btn-post__loader').css('display', 'none');
        $('button#writing-block__post-btn').find('span').text("Post")
        App.pointToID = 0;
        App.inFavor = 0;
        // App.setStorage("myPosts", parseInt(postsLength));
      });
    
    });

  },

  /*Sets variables to point to a given post.*/
  pointTo: function() {
    
    var postID = $(event.target).parents('div.content__post').attr('id'),
        pointToLabel = $('span#writing-block__pointTo-label');

    App.pointToID = parseInt(postID);
    
    pointToLabel.css('display', 'block');
    pointToLabel.find('span#writing-block__pointTo-ID-label').text(postID);
    pointToLabel.show();
    location.href = "#";

  },

  /*Shows how many characters are left when writing a post.*/
  showAvailableCharacters: function(max) {
    var availableCharactes = max - $(event.target).val().length,
        postButton = $('button#writing-block__post-btn');
    postButton.find('span').text(availableCharactes);
    if (availableCharactes < 0) { postButton.attr("disabled", "disabled"); }
  },

  /*_____VOTING_____*/

  /*Makes a vote.*/
  vote: function() {

    if (!App.account) { return; }

    var target = $(event.target),
        postID = parseInt(target.parents('div.content__post').attr('id')),
        shares = parseInt(target.parents('div.post__voting-block').find('input').val()),
        postPormise;

    target.parents('div.post__voting-block').slideUp(250);
    $('button.data-block__vote-btn').css("background-color", "#F4F4F4");

    if (App.voteIndex > 2 && App.voteIndex < 5) {
      postPormise = App.mainInstance.validatePost(postID, shares, App.voteIndex == 3, { from: App.account });
    } else if (App.voteIndex > 0 && App.voteIndex < 3) {
      postPormise = App.mainInstance.votePost(postID, shares, App.voteIndex == 1, { from: App.account });
    } else {
      return;
    }

    postPormise.then(function() {
      var votedPosts = App.getStorage('votedPosts'),
          voteCode = votedPosts ? votedPosts[postID] : undefined;
      if (voteCode) {
        if (voteCode == 0) {voteCode = App.voteIndex < 3 ? 0 : 2; }
        else if (voteCode == 1) {voteCode = App.voteIndex < 3 ? 2 : 1; }
      } else {
        voteCode = App.voteIndex < 3 ? 0 : 1;
      }
      App.setStorage('votedPosts', postID, voteCode);
      App.voteIndex = 0;
    }).catch(function(error) {
      console.log(error);
      App.voteIndex = 0;
    });
  
  },

  /*Selects a vote from a specific post.*/
  selectVote: function() {

    var target = $(event.target),
        postElement = target.parents('div.content__post');

    $('button.data-block__vote-btn').css("background-color", "#F4F4F4");

    if (App.voteIndex > 0) {
      App.voteIndex = 0;
      target.css("background-color", "#F4F4F4");
      $('div.post__voting-block').slideUp(250);
    } else {
      App.voteIndex = target.attr("vote");
      target.css("background-color", "#24e0b4");
      postElement.find('input.voting-block__shares-input').val(1);
      postElement.find('div.post__voting-block').slideDown(250);
    }

    App.handleShares(undefined, postElement);

  },

  /**
   * Displays the needed reputation deposit to get a given amount of shares and displays the fraction
   * of the total shares those are.
   * @param {div.content__post} postElement
   */
  handleShares: function(event, postElement) {

    var value, votingSpace, postID;

    if (event) {
      var target = $(event.target);
      value = target.val();
      postID = target.parents('div.content__post').attr("id");
      votingSpace = target.parents('div.post__voting-block');
    } else if (postElement) {
      postID = postElement.attr("id");
      votingSpace = postElement.find('div.post__voting-block');
      value = 1;
    } else {
      return;
    }

    (App.voteIndex < 3 ? App.getPost(postID) : App.getValidationPost(postID)).then(function(post) {
      var otherShares = parseInt(value) + (App.voteIndex % 2 == 0 ? parseInt(post.againstShares) : parseInt(post.inFavorShares));
      votingSpace.find('span.variables__price').text(App.computePrice(post.inFavorDeposit, post.againstDeposit, value));
      votingSpace.find('span.variables__percentage').text(otherShares == 0 ? 100 : 100 * value / otherShares | 0);
    });

  },

  /*_____ETHEREUM_AND_IPFS_____*/

  // Should all post data be returned as a single object?

  /**
   * Returns a post (post.post on Post.sol).
   * @param {int} postID
   * @param {update} bool Wether to update the data or load it from memory.
   * @param {bool} doNotStore Data won't be stored if true.
   */
  getPost: function(postID, update, doNotStore) {
    if (!update && App.posts[postID]) {
      return new Promise(function (resolve, reject) {
        resolve(App.posts[postID]);
      });
    } else {
      return App.mainInstance.getPost.call(postID).then(function(post) {
        post = App.objectFromPost(post);
        if (!doNotStore) { App.posts[postID] = post; }
        return post;
      });
    }
  },

  /**
   * Returns the validation of a post.
   * @param {int} postID
   * @param {update} bool Wether to update the data or load it from memory.
   * @param {bool} doNotStore Data won't be stored if true.
   * @return {Promise}
   */
  getValidationPost: function(postID, update, doNotStore) {
    if (!update && App.validationPosts[postID]) {
      return new Promise(function (resolve, reject) {
        resolve(App.validationPosts[postID]);
      })
    } else {
      return App.mainInstance.getValidationPost.call(postID).then(function(validation) {
        validation = App.objectFromPost(validation);
        if (!doNotStore) { App.validationPosts[postID] = validation; }
        return validation;
      });
    }
  },

  /**
   * Returns the data of a post.
   * @param {int} postID
   * @param {update} bool Wether to update the data or load it from memory.
   * @param {bool} doNotStore Data won't be stored if true.
   * @return {Promise}
   */
  getPostData: function(postID, update, doNotStore) {
    if (!update && App.postsData[postID]) {
      return new Promise(function (resolve, reject) {
        resolve(App.postsData[postID]);
      })
    } else {
      return App.mainInstance.getPostData.call(postID).then(function(data) {
        var rootPostsValues = [];
        data[8].forEach(function(item) { rootPostsValues.push(parseInt(item)) });
        data = {
          reputation:             parseInt(data[0]),
          lastPropagationAmount:  parseInt(data[1]),
          pointsToID:             parseInt(data[2]),
          timestamp:              parseInt(data[3]),
          hashFunctionIPFS:       parseInt(data[4]),
          inFavor:                data[5] == 1,
          standardHashIPFS:       data[6],
          otherHashIPFS:          data[7],
          rootPosts:              rootPostsValues
        }
        if (!doNotStore) { App.postsData[postID] = data; }
        return data;
      });
    }
  },

  /**
   * Returns the content of a post.
   * @param {int} postID
   * @param {string} hash IPFS multihash of the post.
   * @param {bool} doNotStore Data won't be stored if true.
   * @return {Promise}
   */
  getContent: function(postID, hash, doNotStore) {
    if (App.postsContent[postID]) {
      return new Promise(function (resolve, reject) {
        resolve(App.postsContent[postID]);
      })
    } else {
      return $.getJSON("https://ipfs.io/ipfs/" + hash).then(function(content) {
        if (!doNotStore) { App.postsContent[postID] = content; }
        return content;
      });
    }
  },

  /**
   * Returns the user data.
   * @param {update} bool Wether to update the data or load it from memory.
   * @param {bool} doNotStore Data won't be stored if true.
   * @return {Promise}
   */
  getUserData: function(update, doNotStore) {
    if (!update && App.postsData[postID]) {
      return new Promise(function (resolve, reject) {
        resolve(App.userData);
      })
    } else {
      return App.mainInstance.getUser.call(App.account).then(function(userData) {   
        userData = {
          reputation:             parseInt(userData[0]),
          loanReturnDeadline:     parseInt(userData[1]),
          invitationCooldownTime: parseInt(userData[2]),
          chosenLoanIndex:        parseInt(userData[3]),
          inDebt:                 userData[4],
          userLoanOffersAddress:  userData[5],
          userLoanOffersAmount: [
                                  parseInt(userData[6][0]),
                                  parseInt(userData[6][1]),
                                  parseInt(userData[6][2])
                                ]
        };
        if (!doNotStore) { App.userData = userData; }
        return userData;
      });
    }
  },

  /*Claims welcome gift.*/
  claimGift: function() {
    if (App.account) { App.mainInstance.claimGift({ from: App.account }); }
  },

  /*Updates reputation and checks if gift or withdrawal are available.*/
  updateReputation: function() {

    if (!App.account) { return; }
    
    App.getUserData(true).then(function(userData) {
      var reputationLabel = $('span#reputation-and-refresh__reputation'),
          reputation = userData.reputation / App.decimalValues;
      reputationLabel.attr('title', reputation);
      reputation = (reputation | 0).toString();
      reputationLabel.text('0'.repeat(reputation.length > 3 ? 0 : 4 - reputation.length) + reputation);
      if (reputation == 0) {
        $('div#header__message').html(
          'Initial reputation gift available –<span id="message__claimGift" class="link--toOpaque clickable-span">Click here</span>–'
        );
      } else {
        $('div#header__message').empty();
        var votedPosts = App.getStorage('votedPosts') || {},
            votedPostsIDs = Object.keys(votedPosts),
            allPromises = [],
            getPostAndVotePromises;
        for (var ii = 0; ii < votedPostsIDs.length; ii++) {
          getPostAndVotePromises = [];
          if (votedPosts[votedPostsIDs[ii]] = 0 || votedPosts[votedPostsIDs[ii]] == 2) {
            getPostAndVotePromises.push(App.getPost(votedPostsIDs[ii]));
            getPostAndVotePromises.push(App.mainInstance.getVote(votedPostsIDs[ii], { from: App.account }));
          }
          if (votedPosts[votedPostsIDs[ii]] = 1 || votedPosts[votedPostsIDs[ii]] == 2) {
            getPostAndVotePromises.push(App.getValidationPost(votedPostsIDs[ii]));
            getPostAndVotePromises.push(App.mainInstance.getValidation(votedPostsIDs[ii], { from: App.account }));
          }
          allPromises.push(Promise.all(getPostAndVotePromises).then(function(values) {
            for (var ii = 0; ii < values.length / 2; ii++) {
              if (
                values[ii * 2].inFavorProfit - parseInt(values[ii * 2 + 1][4]) > App.withdrawalThreshold ||
                values[ii * 2].againstProfit - parseInt(values[ii * 2 + 1][5]) > App.withdrawalThreshold ||
                values[ii * 2].inFavorReturns - parseInt(values[ii * 2 + 1][6]) > App.withdrawalThreshold ||
                values[ii * 2].againstReturns - parseInt(values[ii * 2 + 1][7]) > App.withdrawalThreshold
                )
              {
                App.pendentWithdrawalPosts.push(votedPostsIDs[ii]);
                break;
              }
            }
          }));
        }
        Promise.all(allPromises).then(function() {
          if (App.pendentWithdrawalPosts.length > 0) {
            $('div#header__message').html(
              'Reputation available for withdrawal –<span id="withdrawReputation" class="link--toOpaque clickable-span">Click here</span>–'
            );
          }
        });
      }
    });

  },

  /*Withdraws the users available reputation in all voted posts.*/
  withdrawReputation: function() {
    if (!App.account) { return; }
    var votedPosts = App.getStorage('votedPosts'),
        withdrawalPromises = [],
        postID;
    for (var i = 0; i < App.pendentWithdrawalPosts.length; i++) {
      postID = App.pendentWithdrawalPosts[i];
      if (votedPosts[postID] == 0 || votedPosts[postID] == 2) {
        withdrawalPromises.push(App.mainInstance.withdrawPost(postID));
      }
      if (votedPosts[postID] == 1 || votedPosts[postID] == 2) {
        withdrawalPromises.push(App.mainInstance.withdrawValidation(postID));
      }
    }

    Promise.all(withdrawalPromises).then(function() {
      $('div#header__message').empty();
      App.pendentWithdrawalPosts = [];
    });

  },

  /**
   * Returns and stores loading parameters (index and numberOfPostsToLoad).
   * @return {Promise}
   */
  getLoadingParameters: function() {
    return App.mainInstance.postsLength.call().then(function(length) {

      var index, numberOfPostsToLoad;

      length = parseInt(length);

      if (length - 1 > App.numberOfPosts) {
        index = length - App.numberOfPosts;
        numberOfPostsToLoad = App.numberOfPosts;
      } else {
        index = 1;
        numberOfPostsToLoad = length - 1;
      }

      App.loadingParameters = [index, numberOfPostsToLoad];

      return [index, numberOfPostsToLoad];
    
    })
  },

  /*_____PINNING_____*/
  
  /*Stores a posts ID.*/
  pinPost: function() {
    
    if (!App.account) { return; }

    var postID = $(event.target).parents('div.content__post').attr('id'),
        pinnedPosts = App.getStorage("pinnedPosts");
    
    if (!pinnedPosts || !pinnedPosts[postID]) {
      App.setStorage("pinnedPosts", postID, true);
      $(event.target).css("color", "#35E093");
    } else {
      App.removeStorage("pinnedPosts", postID, false);
      $(event.target).css("color", "#36382E");
    }
  },

  /*_____PROCESSING_____*/

  /**
   * Returns the IPFS multihash of a post.
   * @param {postData} post
   * @return {string}
   */
  hashFromPost: function(post) {
    return post.standardHashIPFS == '0x0000000000000000000000000000000000000000000000000000000000000000' ?
      Base58.decode(post.otherHashIPFS) :
      App.toMultihash(post.standardHashIPFS, post.hashFunctionIPFS);
  },

  /**
   * Returns the price of a given amount of shares in a given postition for a given post.
   * @param {int} inFavorDeposit
   * @param {int} againstDeposit
   * @param {int} shares
   * @return {number}
   */
  computePrice: function(inFavorDeposit, againstDeposit, shares) {
    if (App.voteIndex % 2 == 1) {
      return (shares * (App.shareBasePrice + App.priceIncrease * (shares / 2 + inFavorDeposit) / 1000000) / 1000).toFixed(3); 
    } else {
      return (shares * (App.shareBasePrice + App.priceIncrease * (shares / 2 + againstDeposit) / 1000000) / 1000).toFixed(3);
    }
  },

  /**
   * Returns multihash from hash and hash function.
   * @param {string} hash
   * @param {int} hashFunction
   * @return {string}
   */
  toMultihash: function(hash, hashFunction) {
    var hashBytes = buffer.Buffer(hash.slice(2), 'hex')
        multihashBytes = new (hashBytes.constructor)(2 + hashBytes.length);
    
    multihashBytes[0] = hashFunction;
    multihashBytes[1] = 32; // Current standard size is assumed.
    multihashBytes.set(hashBytes, 2);
    return Base58.encode(multihashBytes);
  },

  /**
   * Returns data from multihash
   * @param {string} multihash
   * @return [{string}, {int}, {int}]
   */
  fromMultihash: function(multihash) {
    var decoded = Base58.decode(multihash);
    return [`0x${buffer.Buffer(decoded.slice(2)).toString('hex')}`, decoded[0], decoded[1]];
  },

  /**
   * Returns an object from post data.
   * @param {postContent} post Post data array as retuned by solidity functions.
   * @return {Object}
   */
  objectFromPost: function(post) {
    return {
      inFavorShares:  parseInt(post[0]),
      againstShares:  parseInt(post[1]),
      inFavorDeposit: parseInt(post[2]),
      againstDeposit: parseInt(post[3]),
      inFavorProfit:  parseInt(post[4]),
      againstProfit:  parseInt(post[5]),
      inFavorReturns: parseInt(post[6]),
      againstReturns: parseInt(post[7])
    };
  },

  /*_____STORAGE_____*/
  
  /**
   * Stores data.
   * @param {string} key Key for the storage.
   * @param {} firstValue Value stored / Object key if secondValue is defined.
   * @param {} secondValue Value stored at Object[firstValue].
   */
  setStorage: function(key, firstValue, secondValue) {
    if (!App.account) { return; }
    if (typeof(Storage) !== "undefined") {
      var object = JSON.parse(localStorage.getItem(key + App.account)) || {};
      object[firstValue] = secondValue;
      localStorage.setItem(key + App.account, JSON.stringify(object));
    } else {
      console.warn("Web Storage not supported");
    }
  },
  
  /**
   * Returns stored data.
   * @param {string} key Key for the storage.
   * @return {Object}
   */
  getStorage: function(key) { 
    if (!App.account) { return; }
    if (typeof(Storage) !== "undefined") {
      return JSON.parse(localStorage.getItem(key + App.account));
    } else {
      console.warn("Web Storage not supported");
      return {};
    }
  },
  
  /**
   * Removes stored data.
   * @param {string} key Key for the storage.
   * @param {} value Value stored / Object key.
   */
  removeStorage: function(key, value) {
    if (typeof(Storage) !== "undefined") {
      var object = JSON.parse(localStorage.getItem(key + App.account));
      delete object[value];
      localStorage.setItem(key + App.account, JSON.stringify(object));
    } else {
      console.warn("Web Storage not supported");
    }
  },

  /**
   * Returns a variable from the URL.
   * @param {string} variable Variable name.
   * @return {string | false}
   */
  getQueryVariable: function(variable) {
    
    var query = window.location.search.substring(1),
        variables = query.split("&"),
        pair;
   
    for (var i = 0; i < variables.length; i++) {
      pair = variables[i].split("=");
      if (pair[0] == variable) { return pair[1]; }
    }

    return(false);
    
  },

  /*_____UI_____*/

  /*Shows / hides the direction point menu.*/
  toggleDirectionMenu: function() {
    var directionMenu = $(event.target).parents('div.post__post-footer').find('div.post-footer__point-direction');
        displayAtribute = directionMenu.css("display") == "none" ? "inline" : "none";
    directionMenu.fadeIn(100).css("display", displayAtribute);
  },

  /**
   * Loads a new post over another one. Used to show a root of a post or the post it points to.
   * @param {div.content__post} postElement
   * @param {int} newID ID of the post to load.
   */
  showAnotherPost: function(postElement, newID) {
    postElement.find('div.post__roots-block').hide();
    postElement.find('button.post-footer__roots').removeClass('glyphicon-menu-up').addClass('glyphicon-menu-down').hide();
    postElement.attr('id', newID).find('span.post-heading__postID').text(newID);
    postElement.find('div.post__roots-block').empty();
    App.loadPostContent(postElement, newID);
    App.loadRoots(postElement, newID, true);
  },

  /**
   * Loads a tab.
   * @param {Array<int>} storage Array of the posts to load on the tab.
   */ 
  menuTabClick: function(target, storage) {
    
    window.location.href = "./#";
    
    $('span.navbar__tab').css("font-weight", "normal"); //:not(#${target.id})
    target.css("font-weight", "bold");
    App.loadPostsOver(storage);
    
  },

  /**
   * Sets values of deposit cells on data tables.
   * @param {div.content__post} postElement
   * @param {string} spanName jQueary selector for the target cell.
   * @param {int} vote Vote reputation deposit.
   * @param {int} post Vote total deposit.
   * @param {0 | 1} p Index of the target cell in the jQuery slection.
   */
  setCellValueDeposit: function(postElement, spanName, vote, post, p) {
    vote = vote | 0; // [???]
    postElement.find(spanName).eq(p)
      .text(`${App.account ? (vote / App.decimalValues | 0) + ' / ' : ''}${post / App.decimalValues | 0}`)
      .attr("title", (vote / 1000) + ' / ' + (post / 1000) + ' | ' + (post == 0 ? 0 : 100 * vote / post).toFixed(2) + '%');
  },

  /**
   * Sets values of shares cells on data tables.
   * @param {div.content__post} postElement
   * @param {string} spanName jQueary selector for the target cell.
   * @param {int} vote Vote shares.
   * @param {int} post Vote total shares.
   * @param {0 | 1} p Index of the target cell in the jQuery slection.
   */
  setCellValueShares: function(postElement, spanName, vote, post, p) {
    postElement.find(spanName).eq(p)
      .text(`${App.account ? vote + ' / ' : ''}${post}`)
      .attr("title", vote + ' / ' + post + ' | ' + (post == 0 ? 0 : 100 * vote / post).toFixed(2) + '%' );
  },

  /*Load posts from navbar input.*/
  navbarPostSearch: function() {
    inputText = $('input#post-search__input');
    App.loadPostSearch(inputText.val().split(" "));
    inputText.val("");
  },

  /**
   * Loads an array of posts from the URL or the navbar search input.
   * @param {Array<int>} postToSearch Array of IDs to shearch for.
   */
  loadPostSearch: function(postsToSearch) {
    if (window.innerWidth < 992) { $('div#navbar__buttons').slideUp(250) }
    if (postsToSearch.length == 0) { return; }
    postsToSearch = $.map(postsToSearch, Number);
    $('span.navbar__tab').css("font-weight", "normal");
    App.mainInstance.postsLength.call().then(function(length) {
      var maxID = length - 1,
          ii = 0;
      while (ii < postsToSearch.length) {
        if (postsToSearch[ii] > maxID || postsToSearch[ii] == 0 || postsToSearch[ii] == NaN) {
          postsToSearch.splice(ii);
        } else {
          ii++;
        }
      }
      App.loadPostsOver(postsToSearch);
    });
  },

  /*_____TEMPLATES_____*/

  /**
   * Returns a post's HTML.
   * @param {int} postID
   * @return {string}
   */
  postTemplate: function(postID) {
    return `<div class="content__post" id=${postID}>
              <div class="panel bright">
                <div class="panel-heading post__post-heading dark">
                  <span class="post-heading__timestamp"></span> ID: <span class="post-heading__postID">${postID}</span>
                  <a class="ipfsHash link--toWhite" target="_blank" href="">IPFS</a>
                  <div class="post-heading__pointsTo-block" style="display: inline;">
                    <span class="glyphicon glyphicon-chevron-right"></span>
                    ID: <span class="pointsTo-block__ID">0</span> 
                    [<span class="pointsTo-block__postiton-point glyphicon glyphicon-triangle-top triangle--up"></span> 
                    <span class="pointsTo-block__title clickable-span link--toWhite"></span>]
                  </div>
                  <span class="post-heading__reputation">0</span>
                </div>
                <div class="panel-body bright">
                  <div class="post__text-box col-xs-12 col-md-6"></div>
                  <div class="col-xs-12 col-md-6">
                    ${App.dataTemplate(false)}
                    ${App.dataTemplate(true)}
                  </div>
                </div>
                <div class="panel-body post__voting-block" style="display: none">
                  <div class="voting-block__variables col-xs-12 col-md-10">
                    <span class="variables__price">0</span> RPT — <span class="variables__percentage">0</span>%&nbsp;
                  </div>
                  <div class="col-xs-6 col-md-1">
                    <input type="number" class="voting-block__shares-input" min="1" value="1">
                  </div>
                  <div class="col-xs-6 col-md-1">
                    <button class="btn color voting-block__vote-btn" vote="0">Vote</button>
                  </div>
                </div>
                <div class="panel-body post__roots-block" style="display: none;"></div>
                <div class="panel-footer post__post-footer writing-block__post-btn-footer">
                  <button class="btn post-footer__refresh btn--border-toColor">
                    <span class="glyphicon glyphicon-refresh"></span>
                  </button>
                  <button class="btn post-footer__pin btn--border-toColor" style="display: ${App.account ? "inline" : "none"}">
                    <span class="glyphicon glyphicon-pushpin"></span>
                  </button>
                  <button class="btn post-footer__pointTo btn--border-toColor" style="display: ${App.account ? "inline" : "none"}">
                    <span class="glyphicon glyphicon-screenshot"></span>
                  </button>
                  <div class="post-footer__point-direction" style="display: none">
                    <button class="btn point-direction__inFavor-btn btn--border-toColor" style="display: inline;">
                      <span class="glyphicon glyphicon-triangle-top triangle--up"></span>
                    </button>
                    <button class="btn point-direction__against-btn btn--border-toColor" style="display: inline;">
                      <span class="glyphicon glyphicon-triangle-bottom triangle--down"></span>
                    </button>
                  </div>
                  <button class="btn post-footer__roots btn--border-toColor glyphicon glyphicon-menu-down" style="float: right; display: none">
                  </button>
                </div>
              </div>
            </div>`;
  },

  /**
   * Returns a data-block's HTML.
   * @param {bool} validation True if data is for validation.
   * @return {string}
   */
  dataTemplate: function(validation) {
    return `<div class="post__data-block col-xs-12 col-md-6">
              <span class="data-block__title">${validation ? "Validation" : "Post"}</span>
              <table class="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>IN FAVOR</th>
                    <th>AGAINST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>SHR</td>
                    <td><span class="data-block__infavor-shares"></span></td>
                    <td><span class="data-block__against-shares"></span>
                    </td>
                  </tr>
                  <tr>
                    <td>DPT</td>
                    <td><span class="data-block__infavor-deposit"></span></td>
                    <td><span class="data-block__against-deposit"></span></td>
                  </tr>
                </tbody>
              </table>
              <button class="btn data-block__vote-btn btn--border-toColor bright" style="display: ${App.account ? "inline" : "none"}" vote="${validation ? '3">Green Flag' : '1">Upvote'}</button>
              <button class="btn data-block__vote-btn btn--border-toColor bright" style="display: ${App.account ? "inline" : "none"}" vote="${validation ? '4">Red Flag' : '2">Downvote'}</button>
              <br>
            </div>`
  },
  
  /**
   * Returns a root's HTML.
   * @param {bool} rooID
   * @param {int} timestamp Root's timestamp in seconds.
   * @param {string} title Root's title.
   * @return {string}
   */
  rootTemplate: function(rooID, timestamp, title) {
    var date = new Date(timestamp*1000),
        underMd = window.innerWidth < 992;
        reputationSpan = `<div class="root__reputation-block"><span class="reputation-block__reputation"></span> (<span class="reputation-block__change"></span>)</div>`;

    return `<div><div class="roots-block__root col-12 roots-block__root--mid" id=${rooID}>
            <span class="root__reputation-triange glyphicon"></span>
            ID: ${rooID} ${date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear()}
            ${
              underMd ? // Works fine suposing the user isn't constantly resizing the window. [!!!]
              `${reputationSpan}<br><b>${title}</b>` :
              `<b>${title}</b>${reputationSpan}`
            }
            </div></div>`;
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
