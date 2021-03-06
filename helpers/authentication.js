const Story = require('../models/Story');
const Comment = require('../models/Comment');


function isLoggedIn(req, res, next) {
    return req.user;
}

function userOwnsStory(req, res, next) {
    for (let story of req.user.stories) {
        if (story._id.equals(req.params.story_id)) {
            return true;
        }
    }
    return false;
};

module.exports.ensureLoggedIn = (req, res, next) => {
    if (req.user) {
        return next();
    } else {
        req.flash('alert', 'Please login');
        res.redirect('/');
    }
};

module.exports.ensureUserOwnsStory = (req, res, next) => {
    if (userOwnsStory(req, res, next)) {
        return next();
    } else {
        req.flash('alert', 'Not authorized');
        res.redirect('/stories');
    }
};

module.exports.ensureUserHasAccess = (req, res, next) => {
    if (isLoggedIn(req) && userOwnsStory(req)) {
        return next();
    } else {
        Story.findById(req.params.story_id, (err, story) => {
            if (err) {
                return next();
            }
            else if (!story) {
                let err = new Error('Story not found');
                err.statusCode = 404;
                return next(err);
            }
            else if (story.privacy !== 'PRIVATE') {
                return next();
            } else {
                req.flash('alert', 'Not authorized');
                res.redirect('/stories');
            }
        });
    }
};

function userOwnsComment(user, comment) {
    return comment.author._id.equals(user.id);
}

module.exports.ensureUserOwnsComment = (req, res, next) => {
    Comment
        .findById(req.params.comment_id)
        .populate('author')
        .exec((err, comment) => {
            if (err) {
                return next();
            }
            else if (!comment) {
                let err = new Error('Comment not found');
                err.statusCode = 404;
                return next(err);
            } else if (userOwnsComment(req.user, comment)) {
                next();
            } else {
                req.flash('alert', 'Not authorized');
                res.redirect(`/stories/${req.params.story_id}`);
            }
        });
};

module.exports.ensureUserOwnsCommentOrStory = (req, res, next) => {
    Comment
        .findById(req.params.comment_id)
        .populate('author')
        .exec((err, comment) => {
            if (err) {
                return next();
            }
            else if (!comment) {
                let err = new Error('Comment not found');
                err.statusCode = 404;
                return next(err);
            } else if (userOwnsStory(req, res, next)) {
                next();
            } else if (userOwnsComment(req.user, comment)) {
                next();
            } else {
                req.flash('alert', 'Not authorized');
                res.redirect(`/stories/${req.params.story_id}`);
            }
        });
};

module.exports.ensureStoryAllowsComments = (req, res, next) => {
    Story.findById(req.params.story_id, (err, story) => {
        if (err) {
            return next(err);
        } else if (!story) {
            let err = new Error('Story not found');
            err.statusCode = 404;
            return next(err);
        } else if (!story.allowComments) {
            req.flash('alert', 'Not authorized. This story does not allow comments.');
            res.redirect(`/stories/${req.params.story_id}`);
        } else {
            next();
        }
    });
};