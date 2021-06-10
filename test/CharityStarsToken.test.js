const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
  shouldBehaveLikeERC721Enumerable,
} = require('./behaviors/ERC721.behavior');

const {
  shouldBehaveLikeAccessControl,
  shouldBehaveLikeAccessControlEnumerable,
} = require('./behaviors/AccessControl.behavior');

const { shouldBehaveLikeOwnable } = require('./behaviors/Ownable.behavior');

const ERC721Mock = artifacts.require('CharityStarsTokenMock');

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CREATOR_ROLE = web3.utils.soliditySha3('CREATOR_ROLE');

contract('CharityStarsToken', function (accounts) {
  const name = 'CharityStars Token';
  const symbol = 'CST';

  const baseURI = 'https://api.com/v1/';

  const admin = accounts[0];
  const manager = accounts[1];
  const creator = accounts[2];
  const other = accounts[3];

  beforeEach(async function () {
    this.token = await ERC721Mock.new();
  });

  shouldBehaveLikeAccessControl('AccessControl', ...accounts);
  shouldBehaveLikeAccessControlEnumerable('AccessControl', ...accounts);
  shouldBehaveLikeERC721('ERC721', ...accounts);
  shouldBehaveLikeERC721Metadata('ERC721', name, symbol, ...accounts);
  shouldBehaveLikeERC721Enumerable('ERC721', ...accounts);

  describe('Token behaviors', function () {
    describe('base URI', function () {
      const firstTokenId = new BN('1');

      beforeEach(async function () {
        await this.token.mint(creator);
      });

      it('base URI can\'t be set from not admin', async function () {
        await expectRevert(
          this.token.setBaseURI(baseURI, { from: other }),
          `AccessControl: account ${other.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`,
        );
      });

      it('base URI can be set', async function () {
        await this.token.setBaseURI(baseURI, { from: admin });
      });

      it('base URI is added as a prefix to the token URI', async function () {
        await this.token.setBaseURI(baseURI, { from: admin });
        expect(await this.token.tokenURI(firstTokenId)).to.be.equal(baseURI + firstTokenId.toString());
      });

      it('token URI can be changed by changing the base URI', async function () {
        await this.token.setBaseURI(baseURI, { from: admin });
        const newBaseURI = 'https://api.com/v2/';
        await this.token.setBaseURI(newBaseURI, { from: admin });
        expect(await this.token.tokenURI(firstTokenId)).to.be.equal(newBaseURI + firstTokenId.toString());
      });
    });

    context('testing add creator', function () {
      describe('after adding', function () {
        it('should be enabled', async function () {
          await this.token.grantRole(CREATOR_ROLE, creator, { from: admin });

          expect(await this.token.creatorEnabled(creator)).to.equal(true);
        });
      });
    });

    context('testing create token', function () {
      beforeEach(async function () {
        const category = 'Art';

        await this.token.grantRole(DEFAULT_ADMIN_ROLE, manager, { from: admin });

        await this.token.addCategory(category, { from: manager });

        const categories = await this.token.categories();

        this.tokenSample = {
          title: 'The Amazing NFT',
          description: 'The best NFT on Earth...',
          cid: 'Qwerty12345',
          categoryHash: categories[0].hash,
        };
      });

      context('if an enabled creator is calling', function () {
        beforeEach(async function () {
          await this.token.grantRole(CREATOR_ROLE, creator, { from: manager });
        });

        describe('after creation', function () {
          beforeEach(async function () {
            ({ logs: this.logs } = await this.token.createToken(
              this.tokenSample.title,
              this.tokenSample.description,
              this.tokenSample.cid,
              this.tokenSample.categoryHash,
              { from: creator },
            ));

            this.tokenSample.id = this.logs[0].args.tokenId;

            const categories = await this.token.categories();

            this.category = categories[0];
          });

          it('creator owns the token', async function () {
            expect(await this.token.balanceOf(creator)).to.be.bignumber.equal('1');
            expect(await this.token.ownerOf(this.tokenSample.id)).to.equal(creator);
          });

          it('token has right values', async function () {
            const testToken = await this.token.getToken(this.tokenSample.id);

            testToken.title.should.be.equal(this.tokenSample.title);
            testToken.description.should.be.equal(this.tokenSample.description);
            testToken.cid.should.be.equal(this.tokenSample.cid);

            testToken.category.hash.should.be.equal(this.tokenSample.categoryHash);
          });
        });

        describe('with not existent category', function () {
          it('fails', async function () {
            await expectRevert(
              this.token.createToken(
                this.tokenSample.title,
                this.tokenSample.description,
                this.tokenSample.cid,
                '0x0',
                { from: creator },
              ),
              'Category doesn\'t exist',
            );
          });
        });
      });

      context('if not an enabled creator is calling', function () {
        it('fails', async function () {
          await expectRevert(
            this.token.createToken(
              this.tokenSample.title,
              this.tokenSample.description,
              this.tokenSample.cid,
              this.tokenSample.categoryHash,
              { from: other },
            ),
            `AccessControl: account ${other.toLowerCase()} is missing role ${CREATOR_ROLE}`,
          );
        });
      });
    });

    context('testing burning token', function () {
      const firstTokenId = new BN('1');
      const thirdTokenId = new BN('3');

      const unknownTokenId = new BN('35');

      beforeEach(async function () {
        await this.token.mint(creator);
        await this.token.mint(creator);

        await this.token.grantRole(DEFAULT_ADMIN_ROLE, manager, { from: admin });
      });

      describe('burn', function () {
        const tokenId = firstTokenId;
        let logs = null;

        describe('manager success', function () {
          beforeEach(async function () {
            const result = await this.token.burn(tokenId, { from: manager });
            logs = result.logs;
          });

          it('burns the given token ID and adjusts the balance of the owner', async function () {
            await expectRevert(
              this.token.ownerOf(tokenId),
              'ERC721: owner query for nonexistent token',
            );
            expect(await this.token.balanceOf(creator)).to.be.bignumber.equal('1');
          });

          it('burns the given token ID and adjusts the total supply', async function () {
            await expectRevert(
              this.token.ownerOf(tokenId),
              'ERC721: owner query for nonexistent token',
            );
            expect(await this.token.totalSupply()).to.be.bignumber.equal('1');
          });

          it('when mint again set the right token id and adjust values', async function () {
            ({ logs } = await this.token.mint(creator));

            logs[0].args.tokenId.should.be.bignumber.equal(thirdTokenId);

            expect(await this.token.balanceOf(creator)).to.be.bignumber.equal('2');
            expect(await this.token.totalSupply()).to.be.bignumber.equal('2');
          });

          it('emits a burn event', async function () {
            expectEvent.inLogs(logs, 'Transfer', {
              from: creator,
              to: ZERO_ADDRESS,
              tokenId: tokenId,
            });
          });
        });

        describe('when the given token ID was not tracked by this contract', function () {
          it('reverts', async function () {
            await expectRevert(
              this.token.burn(unknownTokenId, { from: manager }),
              'ERC721: owner query for nonexistent token',
            );
          });
        });

        it('other fails', async function () {
          await expectRevert(
            this.token.burn(tokenId, { from: other }),
            `AccessControl: account ${other.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`,
          );
        });
      });
    });

    context('testing categories', function () {
      beforeEach(async function () {
        await this.token.grantRole(DEFAULT_ADMIN_ROLE, manager, { from: admin });
      });

      it('starts with no categories', async function () {
        const categories = await this.token.categories();
        categories.length.should.be.equal(0);
      });

      describe('adding categories', function () {
        it('owner success', async function () {
          const category = 'Art';

          await this.token.addCategory(category, { from: manager });

          const categories = await this.token.categories();
          categories.length.should.be.equal(1);
          categories[0].name.should.be.equal(category);
          categories[0].visible.should.be.equal(true);
        });

        it('cannot add empty category', async function () {
          const category = '';

          await expectRevert(
            this.token.addCategory(category, { from: manager }),
            'newCategory is required',
          );
        });

        it('cannot add twice', async function () {
          const category = 'Art';

          await this.token.addCategory(category, { from: manager });

          await expectRevert(
            this.token.addCategory(category, { from: manager }),
            'Category already exists',
          );
        });

        it('other fails', async function () {
          const category = 'Art';

          await expectRevert(
            this.token.addCategory(category, { from: other }),
            `AccessControl: account ${other.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`,
          );
        });
      });

      describe('change category visibility', function () {
        beforeEach(async function () {
          const category = 'Art';

          await this.token.addCategory(category, { from: manager });
        });

        it('manager success', async function () {
          let categories = await this.token.categories();

          await this.token.setCategoryVisibility(categories[0].hash, false, { from: manager });

          categories = await this.token.categories();
          categories[0].visible.should.be.equal(false);

          await this.token.setCategoryVisibility(categories[0].hash, true, { from: manager });

          categories = await this.token.categories();
          categories[0].visible.should.be.equal(true);
        });

        it('manager fails with not existent category', async function () {
          await expectRevert(
            this.token.setCategoryVisibility('0x0', false, { from: manager }),
            'Category doesn\'t exist',
          );
        });

        it('other fails', async function () {
          const categories = await this.token.categories();

          await expectRevert(
            this.token.setCategoryVisibility(categories[0].hash, false, { from: other }),
            `AccessControl: account ${other.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`,
          );
        });
      });
    });

    context('testing ownership', function () {
      beforeEach(async function () {
        this.ownable = this.token;
      });

      shouldBehaveLikeOwnable(...accounts);
    });
  });
});
