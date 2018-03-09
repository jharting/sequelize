'use strict';

const chai = require('chai'),
  Sequelize = require('../../../index'),
  expect = chai.expect,
  Support = require(__dirname + '/../support'),
  DataTypes = require(__dirname + '/../../../lib/data-types'),
  Promise = Sequelize.Promise;

describe(Support.getTestDialectTeaser('Include'), () => {
  describe('LIMIT', () => {

    let User = false;
    let Project = false;
    let Task = false;
    let Hobby = false;

    let Post = false;
    let Comment = false;

    /*
     * many-to-many associations:
     * Task <---> Project <---> User <---> Hobby
     *
     * one-to-many associations:
     * Post <+--> Comment
     */
    beforeEach(function () {
      Project = this.sequelize.define('Project', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      User = this.sequelize.define('User', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      Task = this.sequelize.define('Task', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      Hobby = this.sequelize.define('Hobby', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      User.belongsToMany(Project, {through: 'user_project'});
      Project.belongsToMany(User, {through: 'user_project'});

      Project.belongsToMany(Task, {through: 'task_project'});
      Task.belongsToMany(Project, {through: 'task_project'});

      User.belongsToMany(Hobby, {through: 'user_hobby'});
      Hobby.belongsToMany(User, {through: 'user_hobby'});

      Post = this.sequelize.define('Post', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      Comment = this.sequelize.define('Comment', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      }, {timestamps: false});

      Post.hasMany(Comment);
      Comment.belongsTo(Post);
    });

    it('supports many-to-many association with where clause', function () {
      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' }
          ]),
          User.bulkCreate([
            { name: 'Alice' },
            { name: 'Bob' }
          ])
        ))
        .then(([[alpha, bravo, charlie], [alice, bob]]) => Promise.join(
          alpha.addUser(alice),
          bravo.addUser(bob),
          charlie.addUser(alice)
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            where: {
              name: 'Alice'
            }
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 levels of required many-to-many associations', function () {
      User.belongsToMany(Project, {through: 'user_project'});
      Project.belongsToMany(User, {through: 'user_project'});

      User.belongsToMany(Hobby, {through: 'user_hobby'});
      Hobby.belongsToMany(User, {through: 'user_hobby'});

      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' }
          ]),
          User.bulkCreate([
            { name: 'Alice' },
            { name: 'Bob' }
          ]),
          Hobby.bulkCreate([
            { name: 'archery' },
            { name: 'badminton' }
          ])
        ))
        .then(([[alpha, bravo, charlie], [alice, bob], [archery]]) => Promise.join(
          alpha.addUser(alice),
          bravo.addUser(bob),
          charlie.addUser(alice),
          alice.addHobby(archery)
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              required: true
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports required many-to-many association', function () {
      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' }
          ]),
          User.bulkCreate([
            { name: 'Alice' },
            { name: 'Bob' }
          ])
        ))
        .then(([projects, [alice]]) => Promise.join(
          projects[0].addUser(alice), // alpha
          projects[2].addUser(alice) // charlie
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 required many-to-many association', function () {
      User.belongsToMany(Project, {through: 'user_project'});
      Project.belongsToMany(User, {through: 'user_project'});

      Project.belongsToMany(Task, {through: 'task_project'});
      Task.belongsToMany(Project, {through: 'task_project'});

      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' },
            { name: 'delta' },
          ]),
          User.bulkCreate([
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'David' }
          ]),
          Task.bulkCreate([
            { name: 'a' },
            { name: 'c' },
            { name: 'd' }
          ])
        ))
        .then(([[alpha, bravo, charlie, delta], [alice, bob, david], [a, c, d]]) => Promise.join(
          alpha.addUser(alice),
          alpha.addTask(a),
          bravo.addUser(bob),
          charlie.addTask(c),
          delta.addUser(david),
          delta.addTask(d)
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true
          }, {
            model: Task,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('delta');
        });
    });

    it('supports required one-to-many association', function () {
      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Post.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' }
          ]),
          Comment.bulkCreate([
            { name: 'comment1' },
            { name: 'comment2' },
          ])
        ))
        .then(([posts, [comment1, comment2]]) => Promise.join(
          posts[0].addComment(comment1),
          posts[2].addComment(comment2)
        ))
        .then(() => Post.findAll({
          include: [{
            model: Comment,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports required one-to-many association with where clause', function () {
      return this.sequelize.sync({ force: true })
        .then(() => Promise.join(
          Post.bulkCreate([
            { name: 'alpha' },
            { name: 'bravo' },
            { name: 'charlie' }
          ]),
          Comment.bulkCreate([
            { name: 'comment1' },
            { name: 'comment2' },
          ])
        ))
        .then(([posts, [comment1, comment2]]) => Promise.join(
          posts[0].addComment(comment1),
          posts[2].addComment(comment2)
        ))
        .then(() => Post.findAll({
          include: [{
            model: Comment,
            required: true,
            where: {
              name: {
                [this.sequelize.Op.like]: 'comment%'
              }
            }
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        //.tap(result => console.log(JSON.stringify(result.map(r => r.toJSON()), null, 4)))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });
  });
});
