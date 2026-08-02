import assert from "node:assert/strict";
import test from "node:test";
import * as friendService from "../src/services/friend.service.js";
import * as userRepository from "../src/repositories/user.repository.js";
import * as friendRepository from "../src/repositories/friend.repository.js";

test("searchUsers keeps already connected users with relationship status", async () => {
  const originalSearchByQuery = userRepository.searchByQuery;
  const originalListConnectionUserIds = friendRepository.listConnectionUserIds;

  try {
    userRepository.searchByQuery = async () => [
      { _id: "u1", username: "me", displayName: "Me" },
      { _id: "u2", username: "ada", displayName: "Ada" },
      { _id: "u3", username: "grace", displayName: "Grace" },
    ];
    friendRepository.listConnectionUserIds = async () => [
      { requesterId: "u1", recipientId: "u2", status: "accepted" },
      { requesterId: "u1", recipientId: "u3", status: "pending" },
    ];

    const result = await friendService.searchUsers("u1", "u");

    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((user) => ({ username: user.username, relationshipStatus: user.relationshipStatus })),
      [
        { username: "ada", relationshipStatus: "accepted" },
        { username: "grace", relationshipStatus: "pending" },
      ]
    );
  } finally {
    userRepository.searchByQuery = originalSearchByQuery;
    friendRepository.listConnectionUserIds = originalListConnectionUserIds;
  }
});
